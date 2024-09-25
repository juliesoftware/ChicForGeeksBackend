import * as AWS from 'aws-sdk';
import { AppSyncIdentityCognito, AppSyncResolverEvent } from "aws-lambda";
import {
    GQLChannelsResult,
    GQLMessage,
    GQLGetChannelsResponse,
    GQLChannel, GQLUser, QueryToChannelsArgs
} from "../../../../schemas";
import { axiosPost } from "../libs/axiosRequest";
import queries from "./queries";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function getChannelById(channelId: string): Promise<GQLChannel | null> {
    const params = {
        TableName: 'Channel',
        Key: { 'id': channelId }
    };

    try {
        const result = await dynamoDb.get(params).promise();
        return result.Item as GQLChannel || null;
    } catch (error) {
        console.error(`Failed to load channel ${channelId}: ${error}`);
        return null;
    }
}

async function getLatestMessageForChannel(channelId: string): Promise<GQLMessage | null> {
    const params = {
        TableName: 'Message',
        KeyConditionExpression: 'channelId = :channelId',
        ExpressionAttributeValues: {
            ':channelId': channelId,
        },
        ScanIndexForward: false,
        Limit: 1,
    };

    try {
        const response = await dynamoDb.query(params).promise();
        return response.Items && response.Items.length > 0 ? response.Items[0] as GQLMessage : null;
    } catch (error) {
        console.error(`Failed to get latest message for channel ${channelId}: ${error}`);
        return null;
    }
}

async function getUserDetails(userIds: string[]): Promise<GQLUser[]> {
    const query = queries.getUsers();
    const bindvar = { userIds: userIds };
    try {
        const response = await axiosPost(query, bindvar, false);
        return response.data.result ? response.data.result.map(mapUserResult) : [];
    } catch (error) {
        console.error(`Failed to get user details: ${error}`);
        return [];
    }
}

function mapUserResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id,
    };
}

async function getChannelMembershipsAndUserDetails(channelId: string, userId: string): Promise<{ members: GQLUser[], isMuted: boolean | null, unreadMessageCount: number }> {
    const params = {
        TableName: 'ChannelMembership',
        KeyConditionExpression: 'channelId = :channelId',
        ExpressionAttributeValues: {
            ':channelId': channelId,
        },
    };

    try {
        const result = await dynamoDb.query(params).promise();
        let isMuted = null;
        let unreadMessageCount = 0;
        const userIds: any[] = [];

        if (result.Items) {
            result.Items.forEach(item => {
                userIds.push(item.userId);
                if (item.userId === userId) {
                    isMuted = item.isMuted ?? null;
                    unreadMessageCount = parseInt(item.unreadMessageCount) || 0;
                }
            });
        }

        const members = userIds.length > 0 ? await getUserDetails(userIds) : [];
        return { members, isMuted, unreadMessageCount };
    } catch (error) {
        console.error(`Failed to get channel memberships and user details for channel ${channelId}: ${error}`);
        return { members: [], isMuted: null, unreadMessageCount: 0 };
    }
}

export async function handler(
    event: AppSyncResolverEvent<QueryToChannelsArgs>
): Promise<GQLGetChannelsResponse> {
    const page = event.arguments?.page ?? { count: 10 };
    const userId = (event.identity as AppSyncIdentityCognito).claims['custom:userId'];

    // Fetch channels for the user
    const channelsParams = {
        TableName: 'ChannelMembership',
        IndexName: 'userId-lastMessageTimestamp-index', // Use the correct index name
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId,
        },
        ScanIndexForward: false,
        Limit: page?.count,
        ...(page?.cursor && {
            ExclusiveStartKey: {
                channelId: page?.cursor,
                userId: userId
            }
        })
    };

    try {
        const channelsResult = await dynamoDb.query(channelsParams).promise();
        const hasNext = !!channelsResult.LastEvaluatedKey;
        const newNextCursor = hasNext ? channelsResult?.LastEvaluatedKey?.channelId : null;
        const channelIds = channelsResult.Items ? channelsResult.Items.map(item => item.channelId) : [];

        const channelDetailsPromises = channelIds.map(getChannelById);
        const latestMessagesPromises = channelIds.map(getLatestMessageForChannel);

        const [channelDetailsArray, latestMessagesArray, channelsResults] = await Promise.all([
            Promise.all(channelDetailsPromises),
            Promise.all(latestMessagesPromises),
            Promise.all(channelIds.map(channelId => getChannelMembershipsAndUserDetails(channelId, userId)))
        ]);

        const chatPreviews = channelIds.map((channelId, index) => {
            const channel = channelDetailsArray[index];
            const latestMessage = latestMessagesArray[index];
            const { members, isMuted, unreadMessageCount } = channelsResults[index];

            if (!channel) {
                console.error(`Channel not found for id: ${channelId}`);
                return null;
            }

            return {
                channel: {
                    ...channel,
                    isMuted, // Merge isMuted from membership
                },
                latestMessage,
                members,
                unreadMessageCount
            } as GQLChannelsResult;
        }).filter(preview => preview !== null);

        const pageResponse = {
            hasNext: hasNext,
            nextCursor: newNextCursor,
            pageSize: page?.count
        };

        return { results: chatPreviews, page: pageResponse };
    } catch (error) {
        console.error(`Error in handler: ${error}`);
        throw new Error('Error retrieving chat previews');
    }
}
