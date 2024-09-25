import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import {AppSyncIdentityCognito, AppSyncResolverEvent} from "aws-lambda";
import { GQLChannel, MutationToCreateChannelArgs } from "../../../../schemas";
import {createHash} from "crypto";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function handler(
    event: AppSyncResolverEvent<MutationToCreateChannelArgs>
): Promise<GQLChannel> {
    const requestingUser = (event.identity as AppSyncIdentityCognito).claims['custom:userId'];
    const { users, name } = event.arguments;
    const sortedUserIds = [...users].sort();
    const membersHash = generateMembersHash(sortedUserIds);
    let existingChannel;
    if (event.arguments.chatType == "DIRECT") {
        existingChannel = await findExistingChannel(membersHash);
    }

    if (existingChannel) {
        return { id: existingChannel.id, name: existingChannel.name };
    } else {
        const channelId = `chat/${uuidv4()}`;

        const channelItem = {
            id: channelId,
            name: name,
            membersHash: membersHash,
            createdAt: new Date().toISOString(),
            chatType: event.arguments.chatType
        };

        const memberItems = sortedUserIds.map(userId => ({
            PutRequest: {
                Item: {
                    channelId: channelId,
                    userId: userId,
                    joinedAt: new Date().toISOString(),
                    admin: userId == requestingUser
                }
            }
        }));

        const transactParams = {
            TransactItems: [
                {
                    Put: {
                        TableName: 'Channel',
                        Item: channelItem
                    }
                },
                ...memberItems.map(item => ({
                    Put: {
                        TableName: 'ChannelMembership',
                        Item: item.PutRequest.Item
                    }
                }))
            ]
        };

        try {
            await dynamoDb.transactWrite(transactParams).promise();
            return { id: channelId, name: name }; // Return the new channel's details
        } catch (error) {
            console.error('Error creating channel:', error);
            throw new Error('Error creating channel');
        }
    }
}

async function findExistingChannel(membersHash: string): Promise<GQLChannel | null> {
    const queryParams = {
        TableName: 'Channel',
        IndexName: 'membersHash-index',
        KeyConditionExpression: 'membersHash = :membersHash',
        ExpressionAttributeValues: {
            ':membersHash': membersHash,
        },
        Limit: 1
    };

    let queryResult;
    try {
        queryResult = await dynamoDb.query(queryParams).promise();
    } catch (error) {
        console.error('Error querying for existing channel:', error);
        return null;
    }

    if (queryResult.Items && queryResult.Items.length > 0) {
        const item = queryResult.Items[0];
        return item as GQLChannel; // Cast to string to satisfy TypeScript's type checking
    }

    return null;
}

function generateMembersHash(memberIds: string[]): string {
    const sortedIds = memberIds.sort().join('#');
    return createHash('sha256').update(sortedIds).digest('hex');
}
