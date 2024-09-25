import * as AWS from 'aws-sdk';
import {AppSyncResolverEvent} from "aws-lambda";
import {QueryToUsersInChannelArgs} from "../../../../schemas"; // Adjust schema based on your requirements

// Initialize DynamoDB Document Client
const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function getUserIdsForChannel(channelId: string): Promise<string[]> {
    const params = {
        TableName: 'ChannelMembership',
        KeyConditionExpression: 'channelId = :channelId',
        ExpressionAttributeValues: {
            ':channelId': channelId,
        },
    };

    try {
        const result = await dynamoDb.query(params).promise();
        return result.Items ? result.Items.map(item => item.userId) : [];
    } catch (error) {
        console.error(`Failed to get user IDs for channel ${channelId}: ${error}`);
        return [];
    }
}

export async function handler(
    event: AppSyncResolverEvent<QueryToUsersInChannelArgs>
): Promise<string[]> {
    const channelId = event.arguments.channelId;

    try {
        return await getUserIdsForChannel(channelId);
    } catch (error) {
        console.error(error);
        return [];  // Return empty array on error.
    }
}