import {GQLComment, GQLNotificationType, MutationToCommentArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosDelete, axiosInsert, axiosPatch, axiosPost} from "../libs/axiosRequest";

const {Expo} = require('expo-server-sdk')
const expo = new Expo();

export async function handler(
    event: AppSyncResolverEvent<MutationToCommentArgs>
): Promise<GQLComment> {
    let messages = [];
    const returnCount = false;
    if (event.arguments.id != null) {
        const query = queries.single();
        const bindVars = {comment: event.arguments.id};
        const response = await axiosPost(query, bindVars, returnCount)
        const commentUrl = `document/commented/${response.data.result[0]._key}`

        if (event.arguments.delete) {
            await axiosDelete(commentUrl)
            return {};
        } else {
            const commentJson = {
                text: event.arguments.text,
            };

            await axiosPatch(commentUrl, commentJson)
            return commentJson;
        }

    } else {
        const query = queries.findCommentContext()
        const bindVars = {userId: event.arguments.userId, planId: event.arguments.objectId}
        const commentContext = (await axiosPost(query, bindVars, returnCount)).data.result[0];
        let planName = commentContext.plan.name ? commentContext.plan.name : commentContext.plan.location.displayName;
        let joinerIds = commentContext.joiners?.map((joiner: { _id: string }) => joiner._id) || [];
        await axiosPost(queries.insertCommentRelations(),
            {joinerIds: joinerIds,
                planId: event.arguments.objectId,
                commentingUser: event.arguments.userId
            },
            false)
        for (var user of commentContext.joiners) {
            if (user.expoToken) {
                const query = queries.findNotifications()
                const bindVars = {user: user._id}
                let badge = 0;
                const response = await axiosPost(query, bindVars, returnCount)
                const countNotif = response.data
                if (countNotif.result && countNotif.result.length > 0) {
                    badge = countNotif.result[0];
                }
                let message = {
                    to: user.expoToken,
                    title: 'New Comment',
                    body: `${commentContext.user.name} commented on the plan ${planName}`,
                    data: {link: `nomadago://${event.arguments.objectId}`},
                    badge: badge + 1
                }
                messages.push(message);
            }
        }

        if (event.arguments.taggedUsers) {
            const bindVars = {}
            const notifiedUrl = "document/notified"
            for (var usr of event.arguments.taggedUsers) {
                let query = queries.findUserByUsername(usr)
                const response = await axiosPost(query, bindVars, returnCount)

                let userId = response.data
                if (userId.result && userId.result.length > 0) {
                    let taggedUser = userId.result[0];

                    const notificationJson = {
                        _from: event.arguments.objectId,
                        _to: taggedUser._id,
                        related: event.arguments.userId,
                        notificationType: GQLNotificationType.TAG,
                        text: `${commentContext.user.name} tagged you in ${planName}`,
                        created_at: new Date().toISOString(),
                        image: commentContext.user.image,
                        deepLink: commentContext.plan._id,
                        seen: false,
                    }

                    await axiosInsert(notifiedUrl, notificationJson)
                    if (taggedUser.expoToken) {
                        let message = {
                            to: taggedUser.expoToken,
                            title: 'Tagged in a comment',
                            body: `${commentContext.user.name} has tagged you in a comment on the plan ${planName}`,
                            data: {link: `nomadago://${event.arguments.objectId}`}
                        }
                        messages.push(message);
                    }
                }
            }
        }

        const planJson = {
            updated_at: new Date().toISOString()
        };
        let key = event.arguments.objectId.substring(5);
        let planPatchUrl = `document/plan/${key}`

        await axiosPatch(planPatchUrl, planJson)

        const commentUrl = "document/commented"
        const commentJson = {
            _from: event.arguments.userId,
            _to: event.arguments.objectId,
            text: event.arguments.text,
            created_date: new Date().toISOString(),
            taggedUsers: event.arguments.taggedUsers
        };

        const commentResponse = await axiosInsert(commentUrl, commentJson)
        const comment = commentResponse.data

        const chunks = expo.chunkPushNotifications(messages)
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log(ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }
        return {
            ...comment, id: comment._id, owner: {id: event.arguments.userId, name: "", email: "", username: ""},
            plan: {id: event.arguments.objectId, name: "", start: "", end: ""},
            text: event.arguments.text,
            created_at: new Date().toISOString()
        };
    }
}
