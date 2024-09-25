import * as AWS from 'aws-sdk';
import {AppSyncIdentityCognito, AppSyncResolverEvent} from "aws-lambda";
import { MutationToUpdateChannelAdminArgs } from "../../../../schemas";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function handler(
    event: AppSyncResolverEvent<MutationToUpdateChannelAdminArgs>
): Promise<boolean> {
    const { channelId, userId, admin } = event.arguments;

    const updateParams = {
        TableName: 'ChannelMembership',
        Key: { 
            channelId: channelId,
            userId: userId
        },
        UpdateExpression: 'set admin = :admin',
        ExpressionAttributeValues: {
            ':admin': admin
        },
        ReturnValues: "UPDATED_NEW"
    };
    
    const requestingUser = (event.identity as AppSyncIdentityCognito).claims['custom:userId'];
    const isAdmin = await checkIfUserIsAdmin(channelId, requestingUser);
    if (!isAdmin) {
        // Throw an error or return a meaningful message if the user is not an admin
        return false;
    }

    try {
        await dynamoDb.update(updateParams).promise();
        return true; // Successfully updated
    } catch (error) {
        console.error('Error updating admin status:', error);
        throw new Error('Error updating admin status');
    }
}

async function checkIfUserIsAdmin(channelId: string, userId: string): Promise<boolean> {
    const params = {
        TableName: "ChannelMembership",
        Key: {
            channelId: channelId,
            userId: userId,
        },
    };

    try {
        const result = await dynamoDb.get(params).promise();
        if (result.Item) {
            return result.Item.admin === true;
        }
        return false;
    } catch (error) {
        console.error("Error checking admin status:", error);
        throw new Error("Error checking admin status");
    }
}