import * as AWS from 'aws-sdk';
import { AppSyncResolverEvent } from "aws-lambda";
import { GQLGetMessageResponse, GQLMessage, QueryToRepliesArgs } from "../../../../schemas";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

function mapResult(messages: any): GQLMessage {
    return {
        ...messages
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToRepliesArgs>
): Promise<GQLGetMessageResponse> {
    const messageId = event.arguments.messageId;
    const page = event.arguments?.page ?? { count: 10 };

    const params = {
        TableName: 'Reply',
        KeyConditionExpression: 'replyToMessageId = :replyToMessageId',
        ExpressionAttributeValues: {
            ':replyToMessageId': messageId,
        },
        Limit: page?.count,
        ScanIndexForward: false, // To fetch replies in chronological order
        ...(page?.cursor && {
            ExclusiveStartKey: {
                replyToMessageId: messageId,
                createdAt: page?.cursor // Assuming createdAt is the sort key
            }
        })
    };

    try {
        const result = await dynamoDb.query(params).promise();
        const hasNext = !!result.LastEvaluatedKey;
        const newNextCursor = hasNext ? result?.LastEvaluatedKey?.createdAt : null; // Use createdAt as the new cursor
        const pageResponse = {
            hasNext: hasNext,
            nextCursor: newNextCursor,
            pageSize: page?.count
        };
        return { results: result?.Items?.map(mapResult), page: pageResponse };
    } catch (error) {
        throw new Error(`Failed to load replies: ${error}`);
    }
}
