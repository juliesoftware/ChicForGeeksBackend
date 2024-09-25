import * as AWS from 'aws-sdk';
import { AppSyncResolverEvent } from "aws-lambda";
import { GQLGetMessageResponse, GQLMessage, QueryToMessagesArgs } from "../../../../schemas";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

function mapResult(messages: any): GQLMessage {
    return {
        ...messages
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToMessagesArgs>
): Promise<GQLGetMessageResponse> {
    const channelId = event.arguments.channelId;
    const page = event.arguments?.page ?? { count: 10 };

    const params = {
        TableName: 'Message',
        KeyConditionExpression: 'channelId = :channelId',
        ExpressionAttributeValues: {
            ':channelId': channelId,
        },
        Limit: page?.count,
        ScanIndexForward: false,
        ...(page?.cursor && {
            ExclusiveStartKey: {
                channelId: channelId,
                createdAt: page?.cursor
            }
        })
    };

    try {
        const result = await dynamoDb.query(params).promise();
        const hasNext = !!result.LastEvaluatedKey;
        const newNextCursor = hasNext ? result?.LastEvaluatedKey?.createdAt : null;
        const pageResponse = {
            hasNext: hasNext,
            nextCursor: newNextCursor,
            pageSize: page?.count
        };
        return { results: result?.Items?.map(mapResult), page: pageResponse };
    } catch (error) {
        throw new Error(`Failed to load messages: ${error}`);
    }
}
