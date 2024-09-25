import * as AWS from 'aws-sdk';
import { AppSyncIdentityCognito, AppSyncResolverEvent } from "aws-lambda";
import {
    GQLChannelsResult,
    GQLMessage,
    GQLChannel, GQLUser, QueryToChannelArgs
} from "../../../../schemas";
import {axiosPost} from "../libs/axiosRequest";
import queries from "./queries";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function getChannelById(channelId: string): Promise<GQLChannel | null> {
    const params = {
        TableName: 'Channel',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
            ':id': channelId,
        },
    };

    try {
        const result = await dynamoDb.query(params).promise();
        if (result.Items && result.Items.length > 0) {
            return result.Items[0] as GQLChannel;
        }
        return null;
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

    const response = await dynamoDb.query(params).promise();
    if (response.Items && response.Items.length > 0) {
        return response.Items[0] as GQLMessage;
    }
    return null;
}

function mapUserResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id,
    };
}

async function getUserDetails(userIds: string[]): Promise<Array<GQLUser>> {
    const query = queries.getUsers();
    const bindvar = {userIds: userIds};
    const response = await axiosPost(query, bindvar, false)
    return response.data.result ? response.data.result.map(mapUserResult) : [];
}

async function getChannelMembershipsAndUserDetails(channelId: string, userId: string): Promise<{ members: GQLUser[], isMuted: boolean | null }> {
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
        const userIds: any[] = [];

        if (result.Items) {
            result.Items.forEach(item => {
                userIds.push(item.userId);
                if (item.userId === userId) {
                    isMuted = item.isMuted ?? null;
                }
            });
        }

        const members = userIds.length > 0 ? await getUserDetails(userIds) : [];
        return { members, isMuted };
    } catch (error) {
        console.error(`Failed to get channel memberships and user details for channel ${channelId}: ${error}`);
        return { members: [], isMuted: null };
    }
}

export async function handler(
    event: AppSyncResolverEvent<QueryToChannelArgs>
    ): Promise<GQLChannelsResult> {
    try {
        const channelId = event.arguments.channelId;
        const userId = (event.identity as AppSyncIdentityCognito).claims['custom:userId']; // extract userId from the event

        // Fetch the channel details
        const channel = await getChannelById(channelId);
        if (!channel) {
            console.error(`Channel not found for id: ${channelId}`);
            throw new Error('Error retrieving channel information');
        }

        // Fetch the channel memberships and user details
        const { members, isMuted } = await getChannelMembershipsAndUserDetails(channelId, userId);

        // Fetch the latest message for the channel
        const latestMessage = await getLatestMessageForChannel(channelId);

        // Combine the information into a single object
        const channelInfo = {
            channel: {
                ...channel,
                isMuted, // Merge isMuted from membership
            },
            latestMessage,
            members,
        } as GQLChannelsResult;

        return channelInfo;
    } catch (error) {
        console.error(`Error in getSingleChannelInfo: ${error}`);
        throw new Error('Error retrieving channel information');
    }
}