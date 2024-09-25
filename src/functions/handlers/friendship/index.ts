import {GQLGetUsersResponse, GQLUser, QueryToFriendshipArgs,} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {CursorData, generatePageResult, validateAndPrepareCursorData,} from "../libs/cursor";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToFriendshipArgs>
): Promise<GQLGetUsersResponse> {
    const returnCount = true;
    let usrId = event.arguments.userId;
    if (!event.arguments.userId && event.arguments.userName) {
        const query = queries.singleByUserName(event.arguments.userName);
        const bindVars = {};

        const userResponse = await axiosPost(query, bindVars, returnCount)
        usrId = userResponse.data.result[0]._id;
    }
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);
    let query = queries.findFriends(cursor);
    switch (event.arguments.friendshipType) {
        case 'FRIEND':
            query = queries.findFriends(cursor);
            break;
        case 'BLOCKED':
            query = queries.findBlocked(cursor);
            break;
        case 'BLOCKED_BY':
            query = queries.findBlockedBy(cursor);
            break;
        case 'REQUESTED':
            query = queries.findRequestedFriends(cursor);
            break;
        case 'REQUESTED_BY':
            query = queries.findRequestedByFriends(cursor);
            break;
    }
    let querystring = event.arguments?.query ?? '';
    const bindVars = {user: usrId, query: querystring}
    const response = await axiosPost(query, bindVars, returnCount)

    return {
        results: response.data.result.map(mapResult),
        page: generatePageResult(response.data.extra.stats.fullCount, cursor),
    }
}
