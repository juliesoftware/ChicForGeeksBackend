import {
    GQLStatResult, QueryToStatsArgs,
} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(searchResult: any): GQLStatResult {
    return {
        ...searchResult,
        id: searchResult.userId
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToStatsArgs>
): Promise<GQLStatResult> {
    const query = queries.stats();
    const bindVars = {
        from: event.arguments.from,
        to: event.arguments.to,
        userId: event.arguments.userId
    }
    const returnCount = false;

    try {
        const response = await axiosPost(query, bindVars, returnCount);
        return mapResult(response.data.result[0]);
    } catch (error) {
        throw new Error(`Failed search for stats: ${error}`);
    }
}
