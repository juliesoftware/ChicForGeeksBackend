import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import {AppSyncIdentityCognito, AppSyncResolverEvent} from "aws-lambda";
import { MutationToUpdateMuteStatusArgs, GQLChannel } from "../../../../schemas";

const dynamoDb = new DocumentClient();
const channelMembershipTable = 'ChannelMembership';

async function updateMuteStatus(args: MutationToUpdateMuteStatusArgs, userId: String): Promise<GQLChannel> {
    const params: DocumentClient.UpdateItemInput = {
        TableName: channelMembershipTable,
        Key: {
            channelId: args.channelId,
            userId: userId
        },
        UpdateExpression: 'SET isMuted = :isMuted',
        ExpressionAttributeValues: {
            ':isMuted': args.isMuted
        },
        ReturnValues: 'ALL_NEW' // Returns all of the attributes of the item after the update
    };

    try {
        const response = await dynamoDb.update(params).promise();
        return response.Attributes as GQLChannel;
    } catch (error) {
        console.error(`Failed to update mute status for user ${userId} in channel ${args.channelId}: ${error}`);
        throw new Error("Failed to update mute status: " + error);
    }
}

export async function handler(
    event: AppSyncResolverEvent<MutationToUpdateMuteStatusArgs>
): Promise<GQLChannel> {
    const userId = (event.identity as AppSyncIdentityCognito).claims['custom:userId'];
    return await updateMuteStatus(event.arguments, userId);
}