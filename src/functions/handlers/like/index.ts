import {GQLGetUsersResponse, GQLUser, QueryToLikeArgs,} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToLikeArgs>
): Promise<GQLGetUsersResponse> {
    const query = queries.findLiked();
    const bindVars = {plan: event.arguments.objectId};
    const returnCount = true;

    const response = await axiosPost(query, bindVars, returnCount)
    return {
        results: response.data.result.map(mapResult),
        page: {total: response.data.result.length}
    }
}
