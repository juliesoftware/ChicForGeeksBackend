import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { v4 as uuidv4 } from "uuid";
import { AppSyncResolverEvent } from "aws-lambda";
import {
    GQLMessage,
    GQLMessageType,
    MutationToSendMessageArgs,
} from "../../../../schemas";

const dynamoDb = new DocumentClient();
const messageTable = "Message";

async function saveMessage(
  args: MutationToSendMessageArgs
): Promise<GQLMessage> {
  const currentTime = new Date().toISOString();
  const id = uuidv4();

  let attachmentWithType;
  if (args.attachment) {
    if (args.attachment.media) {
      attachmentWithType = {
        __typename: "MediaAttachment",
        data: args.attachment.media.data.map((item) => ({
          mediaType: item?.mediaType,
          reference: item?.reference,
        })),
      };
    } else if (args.messageType == GQLMessageType.PLAN_REFERENCE) {
      attachmentWithType = {
        __typename: "PlanAttachment",
        ...args.attachment,
      };
    }
  }

  const messageItem = {
    id: id,
    channelId: args.channelId,
    senderId: args.senderId,
    messageType: args.messageType,
    data: args.data,
    createdAt: currentTime,
    updatedAt: currentTime,
    attachment: attachmentWithType
  };

  // Save message to DynamoDB
  await dynamoDb
    .put({
      TableName: messageTable,
      Item: messageItem,
    })
    .promise();

  // Return the message in the expected format
  return {
    ...messageItem,
  } as GQLMessage;
}

export async function handler(
  event: AppSyncResolverEvent<MutationToSendMessageArgs>
): Promise<GQLMessage> {
  return await saveMessage(event.arguments);
}
