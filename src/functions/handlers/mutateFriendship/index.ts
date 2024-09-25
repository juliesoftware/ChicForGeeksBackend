import { GQLFriendship, MutationToFriendshipArgs } from "../../../../schemas";
import { AppSyncResolverEvent } from "aws-lambda";
import queries from "./queries";
import { axiosDelete, axiosInsert, axiosPost, axiosPut } from "../libs/axiosRequest";
import { createHash } from "crypto";
import * as AWS from 'aws-sdk';

const { Expo } = require('expo-server-sdk');
const expo = new Expo();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

async function deleteChatChannels(requester: string, requestee: string) {
    const membersHash = generateMembersHash([requester, requestee]);

    // Find channels with the generated membersHash
    const channelsToDelete = await findChannelsByMembersHash(membersHash);

    // Delete each channel and its memberships
    for (const channel of channelsToDelete) {
        await deleteChannelAndMemberships(channel.id);
    }
}

function generateMembersHash(memberIds: string[]): string {
    const sortedIds = memberIds.sort().join('#');
    return createHash('sha256').update(sortedIds).digest('hex');
}

async function findChannelsByMembersHash(membersHash: string): Promise<any[]> { // Adjusted return type
    const queryParams = {
        TableName: 'Channel',
        IndexName: 'membersHash-index', // Replace with the actual index name if different
        KeyConditionExpression: 'membersHash = :membersHash',
        ExpressionAttributeValues: {
            ':membersHash': membersHash,
        },
    };

    try {
        const result = await dynamoDb.query(queryParams).promise();
        return result.Items || []; // Added default empty array
    } catch (error) {
        console.error('Error querying channels:', error);
        throw new Error('Error querying channels');
    }
}

async function deleteChannelAndMemberships(channelId: string) {
    try {
        // First, query to get all memberships for the channel
        const memberships = await dynamoDb.query({
            TableName: 'ChannelMembership',
            KeyConditionExpression: 'channelId = :channelId',
            ExpressionAttributeValues: {
                ':channelId': channelId,
            },
        }).promise();

        if (memberships.Items) {
            let transactionItems = [];
            // Prepare transaction items
            transactionItems.push({
                Delete: {
                    TableName: 'Channel',
                    Key: { id: channelId },
                }
            });

            memberships.Items.forEach((membership) => {
                transactionItems.push({
                    Delete: {
                        TableName: 'ChannelMembership',
                        Key: {
                            channelId: membership.channelId, // Assuming this is the correct path
                            userId: membership.userId        // Assuming this is the correct path
                        }
                    }
                });
            });

            // Perform the transaction
            console.log(transactionItems)
            await dynamoDb.transactWrite({ TransactItems: transactionItems }).promise();
        }
    } catch (error) {
        console.error('Error deleting channel and memberships:', error);
        throw new Error('Error deleting channel and memberships');
    }
}

export async function handler(
    event: AppSyncResolverEvent<MutationToFriendshipArgs>
): Promise<GQLFriendship> {
    const returnCount = false;
    const messages = [];

    let friendshipQuery = queries.findFriendship();
    let friendshipBindVars = {requester: event.arguments.requester, requestee: event.arguments.requestee};
    const friendShipResponse = (await axiosPost(friendshipQuery, friendshipBindVars, returnCount)).data;
    let notificationQuery = queries.findNotifications()
    let notificationBindVars = {user: event.arguments.requester}

    let userQuery = queries.user();
    let requesteeBindVar = {user: event.arguments.requestee};
    const userRequestee = (await axiosPost(userQuery, requesteeBindVar, returnCount)).data

    let requesterBindVar = {user: event.arguments.requester};
    const userRequester = (await axiosPost(userQuery, requesterBindVar, returnCount)).data

    if (userRequestee.result.length == 0 || userRequester.result.length == 0) {
        console.log("Invalid requestee or requester, requestee: " + event.arguments.requestee + ", event.arguments.requester: " + event.arguments.requester);
        console.log(userRequester);
        console.log(userRequestee);
        return {_from: "error", _to: "error"};
    }

    if (friendShipResponse.result.length == 0) {
        const friendshipJson: GQLFriendship = {
            _from: event.arguments.requester,
            _to: event.arguments.requestee,
        };
        if (event.arguments.blocked) {
            friendshipJson.blocked = true;
        } else {
            friendshipJson.requested = true;
        }

        const friendshipUrl = "document/friendship"
        await axiosInsert(friendshipUrl, friendshipJson)

        if (friendshipJson.requested) {
            if (userRequestee.result.length > 0 && userRequestee.result[0].expoToken) {
                let badge = 0;
                const countNotif = (await axiosPost(notificationQuery, notificationBindVars, returnCount)).data
                console.log(countNotif);
                if (countNotif.result && countNotif.result.length > 0) {
                    badge = countNotif.result[0];
                }
                let message = {
                    to: userRequestee.result[0].expoToken,
                    title: 'Friend request',
                    body: `${userRequester.result[0].name} sent you a friend request`,
                    data: {link: `nomadago://user/${userRequester.result[0].username}`},
                    badge: badge + 1,
                }
                messages.push(message);
                const chunks = expo.chunkPushNotifications(messages)
                for (let chunk of chunks) {
                    try {
                        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                        console.log(ticketChunk);
                    } catch (error) {
                        console.error(error);
                    }
                }
            }

        }

        return friendshipJson;
    } else {
        const friendshipJson: GQLFriendship = friendShipResponse.result[0];
        if (event.arguments.unfriend) {
            const unfriendUrl = `document/friendship/${friendshipJson._key}`
            await axiosDelete(unfriendUrl)
            return friendshipJson;
        } else {
            if (event.arguments.blocked) {
                friendshipJson._from = event.arguments.requester;
                friendshipJson._to = event.arguments.requestee;
                friendshipJson.blocked = true;
                friendshipJson.requested = false;

                await deleteChatChannels(event.arguments.requester, event.arguments.requestee);
            } else if (event.arguments.accept) {
                friendshipJson.requested = false;
                if (userRequestee.result.length > 0 && userRequestee.result[0].expoToken) {
                    let badge = 0;
                    const countNotif = (await axiosPost(notificationQuery, notificationBindVars, returnCount)).data
                    if (countNotif.result && countNotif.result.length > 0) {
                        badge = countNotif.result[0];
                    }
                    let message = {
                        to: userRequestee.result[0].expoToken,
                        title: 'Friend request accepted',
                        body: `${userRequester.result[0].name} has accepted your friend request`,
                        data: {link: `nomadago://user/${userRequester.result[0].username}`},
                        badge: badge + 1,
                    }
                    messages.push(message);
                    const chunks = expo.chunkPushNotifications(messages)
                    for (let chunk of chunks) {
                        try {
                            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                            console.log(ticketChunk);
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            }

            let friendInsertUrl = `document/friendship/${friendshipJson._key}`
            await axiosPut(friendInsertUrl, friendshipJson)
            return friendshipJson;
        }
    }
}
