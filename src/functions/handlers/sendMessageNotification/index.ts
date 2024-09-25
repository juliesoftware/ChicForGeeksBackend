import { DynamoDBStreamEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { Expo } from "expo-server-sdk";
import queries from "./queries";
import { axiosPost } from "../libs/axiosRequest";
import { GQLUser } from "../../../../schemas";

const expo = new Expo();

// Initialize DynamoDB DocumentClient
const documentClient = new AWS.DynamoDB.DocumentClient();
const channelMembershipTable = "ChannelMembership";

async function getMemberDetails(channelId: string): Promise<any[] | null> {
    const params = {
        TableName: channelMembershipTable,
        KeyConditionExpression: "channelId = :channelId",
        ExpressionAttributeValues: {
            ":channelId": channelId,
        },
    };

    try {
        const membersResponse = await documentClient.query(params).promise();
        return membersResponse.Items || [];
    } catch (error) {
        console.error(
            `Failed to find member details for channel ${channelId}: ${error}`
            );
        return null; // Return null in case of an error
    }
}

function mapUserResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id,
    };
}

async function getUserDetails(
    userIds: string[]
    ): Promise<Array<GQLUser | null>> {
    const query = queries.getUsers();
    const bindvar = { userIds: userIds };
    const response = await axiosPost(query, bindvar, false);
    return response.data.result ? response.data.result.map(mapUserResult) : [];
}

async function sendNotifications(
  channelId: string,
  senderId: string,
  members: any[],
  messageData: string
) {
    const userIds = members.map((member) => member.userId);

    // Fetch user details, including Expo tokens, from ArangoDB
    const userDetails = await getUserDetails(userIds);

    const sender = userDetails.find(user => user?.id === senderId);
    const senderName = sender?.name || "Sender"; // Default to "Sender" if name is not found

    members = members.map((member) => ({
        ...member,
        expoToken:
      userDetails.find((user) => user?.id === member.userId)?.expoToken || null,
        name: userDetails.find((user) => user?.id === member.userId)?.name || null,
    }));

    const notifications = members
    .filter(
        (member) =>
        member.userId !== senderId && !member.isMuted && member.expoToken
        )
    .map((member) => ({
        to: member.expoToken,
        title: `${senderName}` , // You can customize the title
        body: `${messageData}`, // Customize based on your message structure
        data: { link: `nomadago://${channelId}` }, // Include any additional data you want in the notification payload
        android: {
            channelId: `${channelId}`,
            group: `${channelId}`
        },
        channelId: `${channelId}`,
        _ios: {
            threadId: `${channelId}`, // Use threadId to group notifications on iOS
        },
    }));

    console.log(notifications);

    // Split notifications into chunks to respect Expo's limit per request
    const chunks = expoChunkPushNotifications(notifications);

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log(ticketChunk);
        } catch (error) {
            console.error(error);
        }
    }
}

async function incrementUnreadCounts(
    channelId: string,
    senderId: string,
    members: any[]
    ) {
    try {
        const updatePromises = members
      .filter((member) => member.userId !== senderId && !member.isMuted)
      .map((member) =>
        documentClient
          .update({
              TableName: channelMembershipTable,
              Key: {
                  channelId: channelId,
                  userId: member.userId,
              },
              UpdateExpression:
              "SET unreadMessageCount = if_not_exists(unreadMessageCount, :start) + :incr",
              ExpressionAttributeValues: {
                  ":start": 0,
                  ":incr": 1,
              },
          })
          .promise()
          );

        await Promise.all(updatePromises);
    } catch (error) {
        console.error(
            `Failed to increment unread counts for channel ${channelId}: ${error}`
            );
    }
}

function expoChunkPushNotifications(notifications: any) {
    const chunks: any[] = [];
    const chunkSize = 100; // Expo's limit is 100 notifications per request

    for (let i = 0; i < notifications.length; i += chunkSize) {
        const chunk = notifications.slice(i, i + chunkSize);
        chunks.push(chunk);
    }

    return chunks;
}

exports.handler = async (event: DynamoDBStreamEvent) => {
    for (const record of event.Records) {
        if (record.eventName === 'INSERT' && record.dynamodb && record.dynamodb.NewImage) {
            const newMessage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
            const membersDetails = await getMemberDetails(newMessage.channelId);

            if (membersDetails != null) {
                await incrementUnreadCounts(newMessage.channelId, newMessage.senderId, membersDetails);
                await sendNotifications(newMessage.channelId, newMessage.senderId, membersDetails, newMessage.data);
            }
        }
    }

    return `Successfully sent message notification for ${event.Records.length} records.`;
};