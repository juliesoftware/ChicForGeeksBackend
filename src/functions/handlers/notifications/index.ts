import {GQLGetNotificationsResponse, GQLNotification, QueryToNotificationsArgs,} from "../../../../schemas";
import queries from "./queries";
import {CursorData, generatePageResult, validateAndPrepareCursorData,} from "../libs/cursor";
import {axiosPost} from "../libs/axiosRequest";
import {AppSyncResolverEvent} from "aws-lambda";

function mapResult(notification: any): GQLNotification {
    return {
        ...notification.notification,
        id: notification.notification._id,
        originId: notification.origin?._id ?? null,
        originName: notification.origin?.name ?? null,
        originUser: (notification.origin?._id && notification.origin._id.startsWith("user")) ? {
            ...notification.origin,
            id: notification.origin._id,
            location: {...notification.originLocation}
        } : null,
        originPlan: (notification.origin?._id && notification.origin._id.startsWith("plan")) ? {
            ...notification.origin,
            id: notification.origin._id,
            location: {...notification.originLocation}
        } : null,
        relatedUser: (notification.related?._id && notification.related._id.startsWith("user")) ? {
            ...notification.related,
            id: notification.related._id,
            location: {...notification.originLocation}
        } : null,
        relatedPlan: (notification.related?._id && notification.related._id.startsWith("plan")) ? {
            ...notification.related,
            id: notification.related._id,
            location: {...notification.originLocation}
        } : null,
        otherUser: (notification.other?._id && notification.other._id.startsWith("user")) ? {
            ...notification.other,
            id: notification.other._id,
            location: {...notification.originLocation}
        } : null,
        otherPlan: (notification.other?._id && notification.other._id.startsWith("plan")) ? {
            ...notification.other,
            id: notification.other._id,
            location: {...notification.originLocation}
        } : null,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToNotificationsArgs>
): Promise<GQLGetNotificationsResponse> {
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);

    // Query for paginated notifications
    const notificationsQuery = queries.findNotifications(cursor);
    const bindVars = {
        user: event.arguments.userId
    };

    // Query for unseen count
    const unseenCountQuery = queries.countUnseenNotifications();

    try {
        // Execute both queries
        const [notificationsResponse, unseenCountResponse] = await Promise.all([
            axiosPost(notificationsQuery, bindVars, true),
            axiosPost(unseenCountQuery, bindVars, false)
        ]);

        const notifications = notificationsResponse.data.result.map(mapResult);
        const unseenCount = unseenCountResponse.data.result[0];

        return {
            results: notifications,
            unseenCount: unseenCount,
            page: generatePageResult(notificationsResponse.data.extra.stats.fullCount, cursor), // Adjust according to your needs
        };
    } catch (error){
        if (error instanceof Error) {
            console.error("An error occurred:", error.message);
        } else {
            console.error("An unknown error occurred:", error);
        }
        throw error;
    }
}

