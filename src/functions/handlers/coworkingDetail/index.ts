import {GQLCoworkingResult, QueryToCoworkingArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

async function mapResult(coworking: any): Promise<GQLCoworkingResult> {
    const collection = coworking._id.split('/');
    return {
        ...coworking,
        id: coworking._id,
        serviceType: collection[0].toUpperCase()
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToCoworkingArgs>
): Promise<GQLCoworkingResult> {
    const query = queries.exact();
    const bindVars = {coworkingId: event.arguments.coworkingId};
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
