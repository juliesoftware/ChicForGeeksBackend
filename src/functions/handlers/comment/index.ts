import {GQLGetCommentsResponse, QueryToLikeArgs,} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(comment: any): GQLGetCommentsResponse {
    return {
        ...comment.comment,
        id: comment.comment._id,
        owner: {
            ...comment.owner,
            id: comment.owner?._id ?? null
        },
        plan: {
            ...comment.plan,
            id: comment.plan?._id ?? null
        },
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToLikeArgs>
): Promise<GQLGetCommentsResponse> {
    let query = queries.findCommented();
    const bindVars = {plan: event.arguments.objectId};
    const returnCount = true;

    const response = await axiosPost(query, bindVars, returnCount);
    return {
        results: response.data.result.map(mapResult),
        page: {total: response.data.result.length},
    }
}
