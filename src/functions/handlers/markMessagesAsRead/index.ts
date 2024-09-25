import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {AppSyncResolverEvent} from "aws-lambda";
import {MutationToMarkMessagesAsReadArgs} from "../../../../schemas";

const dynamoDb = new DocumentClient();
const channelMembershipTable = 'ChannelMembership';

async function markMessagesAsRead(channelId: string, userId: string): Promise<boolean> {
    try {
        await dynamoDb.update({
            TableName: channelMembershipTable,
            Key: {
                channelId: channelId,
                userId: userId
            },
            UpdateExpression: 'SET unreadMessageCount = :count',
            ExpressionAttributeValues: {
                ':count': 0
            }
        }).promise();
        return true;
    } catch (error) {
        console.error(`Failed to mark messages as read for channel ${channelId} and user ${userId}: ${error}`);
        return false;
    }
}

export async function handler(
    event: AppSyncResolverEvent<MutationToMarkMessagesAsReadArgs>
): Promise<boolean> {
    const args = event.arguments;

    return await markMessagesAsRead(args.channelId, args.userId);
}
