import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {v4 as uuidv4} from 'uuid';
import {AppSyncResolverEvent} from "aws-lambda";
import {
  GQLMessage,
  GQLMessageType,
  MutationToSendReplyArgs,
} from "../../../../schemas";

const dynamoDb = new DocumentClient();
const messageTable = 'Message';
const replyTable = 'Reply';

async function saveReply(args: MutationToSendReplyArgs): Promise<GQLMessage> {
    const currentTime = new Date().toISOString();
    const id = uuidv4();

    let attachmentWithType;

    if (args.attachment) {
        if (args.attachment.media) {
            attachmentWithType = {
                __typename: 'MediaAttachment',
                data: args.attachment.media.data.map(item => ({
                    mediaType: item?.mediaType,
                    reference: item?.reference
                }))
            };
        } else if (args.messageType == GQLMessageType.PLAN_REFERENCE) {
            attachmentWithType = {
                __typename: 'PlanAttachment',
                ...args.attachment
            };
        }
    }
    
    const replyItem = {
        id: id,
        channelId: args.channelId,
        senderId: args.senderId,
        messageType: args.messageType,
        data: args.data,
        replyToMessageId: args.replyToMessageId,
        createdAt: currentTime,
        updatedAt: currentTime,
        attachment: attachmentWithType
    };

    const replyParams = {
        TableName: replyTable,
        Item: replyItem
    };

    // Retrieve the original message to update its repliesCount
    const queryResponse = await dynamoDb.query({
        TableName: messageTable,
        IndexName: 'id-index',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
            ':id': args.replyToMessageId
        },
        Limit: 1
    }).promise();

    if (queryResponse?.Items && queryResponse?.Items?.length > 0) {
        const message = queryResponse?.Items[0];
        const updateMessageParams = {
            TableName: messageTable,
            Key: {
                channelId: message?.channelId,
                createdAt: message?.createdAt
            },
            UpdateExpression: 'SET repliesCount = if_not_exists(repliesCount, :start) + :incr',
            ExpressionAttributeValues: {
                ':start': 0,
                ':incr': 1
            }
        };

        // Perform both operations: saving the reply and updating the message
        await Promise.all([
            dynamoDb.put(replyParams).promise(),
            dynamoDb.update(updateMessageParams).promise()
        ]);

        // Return the message in the expected format
        return {
            __typename: "Message",
            ...replyItem,
        } as GQLMessage;
    }
    else {
        throw new Error("No items found in queryResponse");
    }
}

export async function handler(
    event: AppSyncResolverEvent<MutationToSendReplyArgs>
): Promise<GQLMessage | undefined> {
    return await saveReply(event.arguments);
}
