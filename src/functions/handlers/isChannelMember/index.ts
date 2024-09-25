import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { GQLMessage } from "../../../../schemas";

const dynamoDb = new DocumentClient();

interface Event {
    channelId: string;
    userId: string; // Provided in the subscription
    message: GQLMessage; // The Message object from the mutation
}

exports.handler = async (event: Event): Promise<GQLMessage> => {
    console.log(event)
    const { channelId, userId, message } = event;

    const params = {
        TableName: 'ChannelMembership',
        KeyConditionExpression: 'channelId = :channelId',
        ExpressionAttributeValues: {
            ':channelId': channelId,
        },
    };

    try {
        const result = await dynamoDb.query(params).promise();
        const isMember = result.Items ? result.Items.some(item => item.userId === userId) : false;

        if (isMember) {
            // User is a member, return the message
            return message;
        } else {
            // User is not a member, return a placeholder message indicating error
            return {
                ...message,
                data: "Unauthorized access", // Placeholder data
                channelId: channelId, // Ensuring channelId is populated
                // Populate other non-nullable fields as necessary
            };
        }
    } catch (error) {
        console.error(`Error querying ChannelMembership: ${error}`);
        // Return a placeholder message indicating error
        return {
            ...message,
            data: `Error processing request: ${error}`,
            channelId: channelId,
            // Populate other non-nullable fields as necessary
        };
    }
};
