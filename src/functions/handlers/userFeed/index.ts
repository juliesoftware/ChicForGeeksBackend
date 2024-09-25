import {
    GQLDirection,
    GQLFeedType,
    GQLField,
    GQLGetPlansResponse,
    GQLUser,
    QueryToUserFeedArgs
} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {CursorData, generatePageResult, validateAndPrepareCursorData,} from "../libs/cursor";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(plan: any): GQLGetPlansResponse {
    return  {
        ...plan.plan,
        id: plan.plan._id,
        counters: plan.counters,
        location: plan.location,
        owner: {
            ...plan.owner,
            id: plan.owner?._id ?? null
        },
        joined: plan.joined.map(mapJoinedResult),
        hasLiked: plan.hasLiked,
    };
}

function mapJoinedResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToUserFeedArgs>
): Promise<GQLGetPlansResponse> {
    console.log({
        message: "User feed has been invoked",
        userId: event.arguments.userId
    });
    const cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);
    const sortField = event.arguments.sort?.field ?? GQLField.UPDATED_AT;
    const sortDirection = event.arguments.sort?.direction ?? GQLDirection.DESC;

    let query;
    if (event.arguments?.filters?.kind === GQLFeedType.PRIVATE) {
        query = queries.private(cursor, event.arguments?.userId, event.arguments?.filters?.country, sortField, sortDirection);
    } else {
        query = queries.public(cursor, event.arguments?.userId, event.arguments?.filters?.country, sortField, sortDirection);
    }

    const response = await axiosPost(query, {}, true);
    return {
        results: response.data.result.map(mapResult),
        page: generatePageResult(response.data.extra.stats.fullCount, cursor),
    };
}