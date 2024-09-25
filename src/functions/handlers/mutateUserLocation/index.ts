import {
    GQLLocation,
    GQLNotificationType,
    MutationToUpdateUserLocationArgs
} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost, axiosSimplePost} from "../libs/axiosRequest";

const {Expo} = require('expo-server-sdk')
const expo = new Expo();

function mapResult(user: any): GQLLocation {
    return {
        ...user.location
    };
}

export async function handler(
    event: AppSyncResolverEvent<MutationToUpdateUserLocationArgs>
): Promise<GQLLocation> {
    let bindvars = {
        userId: event.arguments.userId,
        latitude: event.arguments.locationInput?.lat,
        longitude: event.arguments.locationInput?.lng
    }
    let messages = [];
    let requestingUser = (await axiosPost(queries.updateLocationOnUser(), bindvars, false)).data.result[0]

    const today = new Date();
    const priorDate = new Date(new Date().setDate(today.getDate() - 30));
    let priorDateString = priorDate.toISOString();
    const joiners = (await axiosPost(
        queries.mapView(event.arguments.locationInput?.lat, event.arguments.locationInput?.lng),
        {user: event.arguments.userId},
        false
    )).data

    var userIds = joiners.result.length > 0 ? joiners.result : []
    var usersToNotify = (await axiosPost(
        queries.getNotifiableUsers(),
        {userIds: userIds, date: priorDateString},
        false)).data

    for (var user of usersToNotify.result) {
        const notificationJson = {
            _from: event.arguments.userId,
            _to: user._id,
            notificationType: GQLNotificationType.NEARBY_FRIEND,
            text: `${requestingUser.name} is nearby. Reach out and make a plan!`,
            created_at: new Date().toISOString(),
            seen: false,
            image: requestingUser.image,
            deepLink: requestingUser._id
        }
        await axiosSimplePost("document/notified", notificationJson)

        if (user.expoToken) {
            let badge = 0;
            const countNotif = (await axiosPost(queries.findNotifications(), {user: user._id}, false)).data
            if (countNotif.result && countNotif.result.length > 0) {
                badge = countNotif.result[0];
            }
            let message = {
                to: user.expoToken,
                title: 'Nearby friend',
                body: `${requestingUser.name} is nearby`,
                data: {link: `nomadago://user/${requestingUser.username}`},
                badge: badge + 1
            }
            messages.push(message);
        }
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
    return mapResult(requestingUser)
}
