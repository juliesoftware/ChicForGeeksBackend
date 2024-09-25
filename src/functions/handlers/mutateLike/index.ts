import {GQLLike, GQLNotificationType, MutationToLikeArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosDelete, axiosPost, axiosSimplePost} from "../libs/axiosRequest";

const {Expo} = require('expo-server-sdk')
const expo = new Expo();

export async function handler(
    event: AppSyncResolverEvent<MutationToLikeArgs>
): Promise<GQLLike> {
    const returnCount = false;
    let likingUser = (await axiosPost(queries.findUser(), {
        userId: event.arguments.requester
    }, returnCount)).data.result[0]

    const likeResponse = (await axiosPost(queries.findLike(), {
        requester: event.arguments.requester,
        object: event.arguments.object
    }, returnCount)).data

    const likeJson: GQLLike = {
        _from: event.arguments.requester,
        _to: event.arguments.object,
    };
    if (likeResponse.result.length == 0 && event.arguments.like) {
        let notifType = GQLNotificationType.LIKED_PLAN;
        let planResponse = (await axiosPost(queries.findPlan(), {object: event.arguments.object}, returnCount)).data.result[0]
        let user = planResponse.owner;
        let planName = planResponse.plan.name ? planResponse.plan.name : planResponse.plan.location.displayName;

        const notificationJson = {
            _from: event.arguments.object,
            _to: user._id,
            related: event.arguments.requester,
            deepLink: planResponse.plan._id,
            image: likingUser.image,
            notificationType: notifType,
            text: `${likingUser.name} liked your plan ${planName}`,
            created_at: new Date().toISOString(),
            seen: false,
        }
        const messages = [];
        if (user.expoToken) {
            let badge = 0;
            const countNotif = (await axiosPost(queries.findNotifications(), {user: user._id}, returnCount)).data
            if (countNotif.result && countNotif.result.length > 0) {
                badge = countNotif.result[0];
            }
            let message = {
                to: user.expoToken,
                title: 'New Like',
                body: `${likingUser.name} liked your plan ${planName}`,
                data: {link: `nomadago://${planResponse.plan._id}`},
                badge: badge + 1
            }
            messages.push(message);
        }
        const chunks = expo.chunkPushNotifications(messages)
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log(ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }
        await axiosSimplePost("document/notified", notificationJson)
        await axiosSimplePost("document/liked", likeJson)
    } else if (likeResponse.result.length != 0 && !event.arguments.like) {
        const likeResult: GQLLike = likeResponse.result[0];
        await axiosDelete(`document/liked/${likeResult._key}`)
    }
    return likeJson;
}
