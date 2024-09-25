import { DynamoDBStreamEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';

// Initialize DynamoDB DocumentClient
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event: DynamoDBStreamEvent) => {
    for (const record of event.Records) {
        if (record.eventName === 'INSERT' && record.dynamodb && record.dynamodb.NewImage) {
            const newMessage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

            // Assuming you have a method to retrieve channel member IDs
            const memberUserIds = await getChannelMemberUserIds(newMessage.channelId);

            // Update UserChannelActivity for each member
            for (const userId of memberUserIds) {
                await updateUserChannelActivity(userId, newMessage.channelId, newMessage.createdAt);
            }
        }
    }

    return `Successfully processed ${event.Records.length} records.`;
};

async function getChannelMemberUserIds(channelId: string): Promise<string[]> {
    const params = {
        TableName: 'ChannelMembership',
        KeyConditionExpression: 'channelId = :channelId',
        ExpressionAttributeValues: {
            ':channelId': channelId,
        },
    };
    
    const result = await documentClient.query(params).promise();
    const userIds: any[] = [];

    if (result.Items) {
        result.Items.forEach(item => {
            userIds.push(item.userId);
        });
    }
    // Placeholder: Implement logic to fetch member user IDs from your ChannelMembership table
    // This should be replaced with your actual logic to retrieve channel members
    return userIds // Return an array of user IDs
}

async function updateUserChannelActivity(userId: string, channelId: string, lastMessageTimestamp: string) {
    const params = {
        TableName: 'ChannelMembership',
        Key: { channelId, userId },
        UpdateExpression: 'set lastMessageTimestamp = :timestamp',
        ExpressionAttributeValues: {
            ':timestamp': lastMessageTimestamp,
        },
    };

    try {
        await documentClient.update(params).promise();
    } catch (error) {
        console.error(`Error updating activity for user ${userId} in channel ${channelId}:`, error);
    }
}