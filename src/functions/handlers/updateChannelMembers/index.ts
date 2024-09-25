import * as AWS from "aws-sdk";
import {AppSyncIdentityCognito, AppSyncResolverEvent} from "aws-lambda";
import {v4 as uuidv4} from 'uuid';
import {
    GQLChannel,
    GQLMessage, GQLMessageType,
    GQLUser,
    MutationToUpdateChannelMembersArgs,
} from "../../../../schemas";
import { createHash } from "crypto";
import { axiosPost } from "../libs/axiosRequest";
import queries from "./queries";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

function mapUserResult(user: any): GQLUser {
  return {
    ...user,
    id: user._id,
  };
}

async function sendSystemMessage(
  channelId: string,
  messageText: string,
  messageType: GQLMessageType
  ) : Promise<GQLMessage> {
  const currentTime = new Date().toISOString();
  const id = uuidv4(); // Generate a unique ID for the message

  const messageItem = {
    id: id,
    channelId: channelId,
    senderId: "System", // Or use a designated system user ID
    messageType: messageType,
    data: messageText,
    createdAt: currentTime,
    updatedAt: currentTime,
    attachment: undefined
  };

  // Save the system message to DynamoDB
  await dynamoDb
    .put({
      TableName: 'Message',
      Item: messageItem,
    })
    .promise();

  return {
    ...messageItem,
  } as GQLMessage;
}

async function getUserDetails(
  userIds: string[]
): Promise<Array<GQLUser | null>> {
  const query = queries.getUsers();
  const bindvar = { userIds: userIds };
  const response = await axiosPost(query, bindvar, false);
  return response.data.result ? response.data.result.map(mapUserResult) : [];
}

async function getChannelById(channelId: string): Promise<GQLChannel | null> {
  const params = {
    TableName: "Channel",
    Key: {
      id: channelId,
    },
  };

  try {
    const result = await dynamoDb.get(params).promise();
    if (result.Item) {
      return result.Item as GQLChannel;
    }
    return null;
  } catch (error) {
    console.error("Error getting channel by ID:", error);
    throw new Error("Error getting channel by ID");
  }
}

async function getChannelMembers(
  channelId: string
  ): Promise<Array<{ userId: string }>> {
  const params = {
    TableName: "ChannelMembership",
    KeyConditionExpression: "channelId = :channelId",
    ExpressionAttributeValues: {
      ":channelId": channelId,
    },
  };

  try {
    const result = await dynamoDb.query(params).promise();
    return result.Items as Array<{ userId: string }>;
  } catch (error) {
    console.error("Error getting channel members:", error);
    throw new Error("Error getting channel members");
  }
}

function generateMembersHash(memberIds: string[]): string {
  const sortedIds = memberIds.sort().join("#");
  return createHash("sha256").update(sortedIds).digest("hex");
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

export async function handler(
  event: AppSyncResolverEvent<MutationToUpdateChannelMembersArgs>
): Promise<GQLMessage> {
  const requestingUser = (event.identity as AppSyncIdentityCognito).claims['custom:userId'];
  const { channelId, name, membersToAdd, membersToRemove } = event.arguments;

  const isAdmin = await checkIfUserIsAdmin(channelId, requestingUser);
  if (!isAdmin) {
    // Throw an error or return a meaningful message if the user is not an admin
    throw new Error("User does not have rights to change the member list");
  }

  // Ensure membersToAdd and membersToRemove are arrays, defaulting to empty if not provided
  let membersToAddActual = membersToAdd || [];
  let membersToRemoveActual = membersToRemove || [];

  // Fetch the existing channel
  const channel = await getChannelById(channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  // Prepare the updates
  const updateParams: AWS.DynamoDB.DocumentClient.TransactWriteItemsInput = {
    TransactItems: [],
  };

  // Update the channel name if provided
  if (name && name !== channel.name) {
    updateParams.TransactItems.push({
      Update: {
        TableName: "Channel",
        Key: { id: channelId },
        UpdateExpression: "set #name = :newName",
        ExpressionAttributeNames: { "#name": "name" },
        ExpressionAttributeValues: { ":newName": name },
      },
    });
    channel.name = name; // Update local channel object
  }

  let memberIds: string[] = [];
  let membersHashNeedsUpdate = false;

  if (membersToAddActual.length > 0 || membersToRemoveActual.length > 0) {
    // Fetch current channel members only if necessary
    const currentMembers = await getChannelMembers(channelId);
    memberIds = currentMembers.map((m) => m.userId) ?? []; // Extract just the user IDs

    // Determine members to add by excluding existing members
    membersToAddActual = membersToAddActual.filter(
      (memberId: any): memberId is string => memberId !== null
    );

    // Add new members
    membersToAddActual.forEach((memberId: any) => {
      updateParams.TransactItems.push({
        Put: {
          TableName: "ChannelMembership",
          Item: {
            channelId: channelId,
            userId: memberId,
            joinedAt: new Date().toISOString(),
          },
        },
      });
    });

    // Determine members to remove that are currently part of the channel
    membersToRemoveActual = membersToRemoveActual.filter(
      (memberId: any): memberId is string =>
        memberId !== null && memberIds.includes(memberId)
    );

    // Remove members
    membersToRemoveActual.forEach((memberId: any) => {
      updateParams.TransactItems.push({
        Delete: {
          TableName: "ChannelMembership",
          Key: {
            channelId: channelId,
            userId: memberId,
          },
        },
      });
    });

    // If members were updated, set flag to recalculate the membersHash
    membersHashNeedsUpdate =
      membersToAddActual.length > 0 || membersToRemoveActual.length > 0;
  }

  // Recalculate and update membersHash if necessary
  if (membersHashNeedsUpdate) {
    const membersToAddSafe = (membersToAdd || []).filter(
      (memberId: any): memberId is string => memberId !== null
    );
    const membersToRemoveSafe = (membersToRemove || []).filter(
      (memberId: any): memberId is string => memberId !== null
    );

    const updatedMemberIds = memberIds
      // Ensure memberIds only contains strings before filtering
      .filter(
        (id): id is string => id !== null && !membersToRemoveSafe.includes(id)
      )
      // Concatenate with membersToAddSafe, which is guaranteed to only contain strings
      .concat(membersToAddSafe)
      .sort();

    const membersHash = generateMembersHash(updatedMemberIds);
    updateParams.TransactItems.push({
      Update: {
        TableName: "Channel",
        Key: { id: channelId },
        UpdateExpression: "set membersHash = :membersHash",
        ExpressionAttributeValues: { ":membersHash": membersHash },
      },
    });
    channel.membersHash = membersHash; // Update local channel object
  }

  // Execute the transaction
  try {
    await dynamoDb
      .transactWrite({
        TransactItems: updateParams.TransactItems,
      })
      .promise();

    if (membersToAddActual.length > 0) {
      // Filter out null values
      const validMembersToAdd = membersToAddActual.filter(
        (memberId: any): memberId is string => memberId !== null
      );
      const members = await getUserDetails(validMembersToAdd);
      const memberDetail = members.find((m) => m?.id === validMembersToAdd[0]);
      return await sendSystemMessage(
        channelId,
        `${memberDetail?.name} joined the chat`,
        GQLMessageType.SYSTEM_MESSAGE
        );
    }

    if (membersToRemoveActual.length > 0) {
      // Filter out null values
      const validMembersToRemove = membersToRemoveActual.filter(
        (memberId: any): memberId is string => memberId !== null
      );
      const members = await getUserDetails(validMembersToRemove);
      const memberDetail = members.find((m) => m?.id === validMembersToRemove[0]);
      return await sendSystemMessage(
        channelId,
        `${memberDetail?.name} left the chat`,
        GQLMessageType.SYSTEM_MESSAGE
        );
    }
  } catch (error) {
    console.error("Error updating channel:", error);
    throw new Error("Error updating channel");
  }

  return {
    undefined,
  } as GQLMessage;
}