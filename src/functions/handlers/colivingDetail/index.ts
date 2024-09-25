import {GQLColivingResult, QueryToColivingArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

async function mapResult(coliving: any): Promise<GQLColivingResult> {
    return {
        ...coliving,
        id: coliving._id
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToColivingArgs>
): Promise<GQLColivingResult> {
    const query = queries.exact();
    const bindVars = {coliving: event.arguments.colivingId};
    const returnCount = false;

    try {
        const response = await axiosPost(query, bindVars, returnCount)
        const result = response.data.result[0];
        return mapResult(result);
    } catch (err) {
        console.error(err);
        throw err;
    }
}
