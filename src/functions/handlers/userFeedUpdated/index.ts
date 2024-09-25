import axios from "axios";
import {GQLFeedType, GQLGetPlansResponse, GQLUser, QueryToUserFeedArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {CursorData, generatePageResult, validateAndPrepareCursorData,} from "../libs/cursor";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(plan: any): GQLGetPlansResponse {
    let result = {
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
    return result
}

function mapJoinedResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToUserFeedArgs>
): Promise<any> {
    return null;
}
