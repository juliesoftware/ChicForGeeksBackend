import {GQLJoin, GQLJoinType, GQLNotificationType, MutationToJoinArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosDelete, axiosPost, axiosPut, axiosSimplePost} from "../libs/axiosRequest";

const {Expo} = require('expo-server-sdk')
const expo = new Expo();

export async function handler(
    event: AppSyncResolverEvent<MutationToJoinArgs>
): Promise<GQLJoin> {

    const notifiedUrl = "document/notified"
    const joinUrl = "document/join"
    const returnCount = false
    const messages = [];
    let notifUser;
    let title;
    let body;
    let joinBindVars = {plan: event.arguments.plan, user: event.arguments.user}
    let userBindVars = {user: event.arguments.user}
    let planBindVars = {plan: event.arguments.plan}
    const joinResponse = (await axiosPost(queries.findJoin(), joinBindVars, returnCount)).data

    const joinJson: GQLJoin = {
        _from: event.arguments.user,
        _to: event.arguments.plan,
        joinStatus: event.arguments.joinType,
    };

    if (joinResponse.result.length == 0 && event.arguments.joinType != GQLJoinType.UNJOIN) {
        const requestingUser = (await axiosPost(queries.user(), {user: event.arguments.requester}, returnCount)).data.result[0];
        const planResponse = (await axiosPost(queries.getPlan(), {plan: event.arguments.plan}, returnCount)).data.result[0];
        const planDisplayName = planResponse.name ? planResponse.name : planResponse.location.displayName;

        if (event.arguments.joinType == GQLJoinType.INVITED) {
            notifUser = (await axiosPost(queries.user(), userBindVars, returnCount)).data;

            title = 'New Plan Invitation';
            body = `${requestingUser.name} invited you to ${planDisplayName}`;
            const notificationJson = {
                _from: event.arguments.plan,
                _to: event.arguments.user,
                related: event.arguments.requester,
                notificationType: GQLNotificationType.PLAN_INVITE,
                text: `${requestingUser.name} invited you to ${planDisplayName}`,
                created_at: new Date().toISOString(),
                image: requestingUser.image,
                deepLink: planResponse._id,
                seen: false
            }
            await axiosSimplePost(notifiedUrl, notificationJson)
        } else if (event.arguments.joinType == GQLJoinType.REQUESTED) {
            const plan = (await axiosPost(queries.getPlan(), planBindVars, returnCount)).data.result[0]
            joinJson.start = event.arguments.start ? event.arguments.start : plan.start
            joinJson.end = event.arguments.end ? event.arguments.end : plan.end
            notifUser = (await axiosPost(queries.user(), {user: plan.owner}, returnCount)).data

            title = 'New Plan Join Request';
            body = `${requestingUser.name} has requested to join your plan ${planDisplayName}`;
            const notificationJson = {
                _from: event.arguments.plan,
                _to: planResponse.owner,
                related: event.arguments.requester,
                notificationType: GQLNotificationType.PLAN_JOIN_REQUEST,
                text: `${requestingUser.name} has requested to join your plan ${planDisplayName}`,
                created_at: new Date().toISOString(),
                image: requestingUser.image,
                deepLink: planResponse._id,
                seen: false
            }
            await axiosSimplePost(notifiedUrl, notificationJson)
        }
        await axiosSimplePost(joinUrl, joinJson)
    } else {
        const joinJsonRead: GQLJoin = joinResponse.result[0];
        if (event.arguments.joinType == GQLJoinType.UNJOIN) {
            await axiosDelete(`document/join/${joinJsonRead._key}`)
        } else {
            if (event.arguments.joinType == GQLJoinType.JOINED) {
                let notifType = GQLNotificationType.PLAN_JOIN_REQUEST_APPROVED;
                let toNotif = event.arguments.user;

                const plan = (await axiosPost(queries.getPlan(), {plan: event.arguments.plan}, returnCount)).data.result[0];
                const planDisplayName = plan.name ? plan.name : plan.location.displayName;
                const approvingUser = (await axiosPost(queries.user(), {user: event.arguments.requester}, returnCount)).data.result[0];
                title = 'Plan Join Request Approved';
                body = `${approvingUser.name} approved your request to join ${planDisplayName}`;

                if (joinJsonRead.joinStatus == GQLJoinType.INVITED) {
                    notifType = GQLNotificationType.PLAN_INVITE_ACCEPTED;
                    title = 'Plan Invitation Accepted';
                    body = `${approvingUser.name} approved your request to join ${planDisplayName}`;
                    toNotif = plan.owner;
                }
                notifUser = (await axiosPost(queries.user(), {user: toNotif}, returnCount)).data

                const notificationJson = {
                    _from: event.arguments.plan,
                    _to: toNotif,
                    related: event.arguments.requester,
                    notificationType: notifType,
                    text: `${approvingUser.name} approved your request to join ${planDisplayName}`,
                    created_at: new Date().toISOString(),
                    image: approvingUser.image,
                    deepLink: plan._id,
                    seen: false
                }
                await axiosSimplePost(notifiedUrl, notificationJson)
            }

            await axiosPut(`document/join/${joinJsonRead._key}`, joinJson)
        }
    }
    if (notifUser && notifUser.result.length > 0 && notifUser.result[0].expoToken) {
        let badge = 0;
        const countNotif = (await axiosPost(queries.findNotifications(), {user: notifUser.result[0]._id}, returnCount)).data
        if (countNotif.result && countNotif.result.length > 0) {
            badge = countNotif.result[0];
        }
        let message = {
            to: notifUser.result[0].expoToken,
            title: title,
            body: body,
            data: {link: `nomadago://${event.arguments.plan}`},
            badge: badge + 1,
        }
        messages.push(message);
        const chunks = expo.chunkPushNotifications(messages)
        for (let chunk of chunks) {
            try {
                await expo.sendPushNotificationsAsync(chunk);
            } catch (error) {
                console.error(error);
            }
        }
    }
    return joinJson;
}
