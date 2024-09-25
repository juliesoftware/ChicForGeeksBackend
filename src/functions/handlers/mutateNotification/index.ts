import {GQLNotification, MutationToNotificationArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPatch, axiosPost} from "../libs/axiosRequest";

export async function handler(
    event: AppSyncResolverEvent<MutationToNotificationArgs>
): Promise<GQLNotification> {
    const returnCount = false;
    if (event.arguments.id != null) {
        const notificationResponse = (await axiosPost(queries.single(), {notification: event.arguments.id}, returnCount)).data

        const commentJson = {
            id: event.arguments.id,
            seen: event.arguments.seen,
            actionTaken: event.arguments.actionTaken
        };

        await axiosPatch(`document/notified/${notificationResponse.result[0]._key}`, commentJson)
        return commentJson;
    }
    return {id: "", created_at: ""};

}
