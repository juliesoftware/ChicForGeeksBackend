import {GQLGetUsersResponse, GQLUser, QueryToFriendsArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {CursorData, generatePageResult, validateAndPrepareCursorData} from "../libs/cursor";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToFriendsArgs>
): Promise<GQLGetUsersResponse> {
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);
    const query = queries.all(cursor);
    const bindVars = {
        requester: event.arguments.requester,
        requestee: event.arguments.requestee
    };
    const returnCount = true;

    console.log({
        message: "Friends has been invoked",
        requester: event.arguments.requester,
        requestee: event.arguments.requestee
    });

    try {
        const response = await axiosPost(query, bindVars, returnCount);
        return {
            results: response.data.result[0].map(mapResult),
            page: generatePageResult(response.data.extra.stats.fullCount, cursor),
        }
    } catch (error) {
        throw new Error("Failed search friends: " + error);
    }
}
