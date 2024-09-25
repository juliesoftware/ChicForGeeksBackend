import {GQLGetUsersResponse, GQLUser, QueryToUserSearchArgs,} from "../../../../schemas";
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
    event: AppSyncResolverEvent<QueryToUserSearchArgs>
): Promise<GQLGetUsersResponse> {
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);

    console.log(event)
    console.log({
        message: "User search has been invoked",
        userId: event.arguments.requester
    });
    const queryText = event?.arguments?.query ?? null;

    let query = "";
    let bindvar = {};
    if (event.arguments.exact) {
        query = queries.exact();
        bindvar = {query: event.arguments.query.toLowerCase()}
    } else if (queryText == null || queryText === "") {
        query = queries.random(cursor);
        bindvar = {requester: event.arguments.requester}
    } else {
        query = queries.all(cursor)
        bindvar = {query: event.arguments.query.toLowerCase(), requesterId: event.arguments.requester}
    }
    const response = await axiosPost(query,bindvar, true)
    return {
        results: response.data.result.map(mapResult),
        page: generatePageResult(response.data.extra.stats.fullCount, cursor)
    }
}
