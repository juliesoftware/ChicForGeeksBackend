import {
    GQLGetBusinessResponse,
    QueryToBusinessArgs
} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(searchResult: any): GQLGetBusinessResponse {
    return {
        colivings: searchResult.colivings.map((colivingResult: any) => ({
            ...colivingResult,
            id: colivingResult._id
        })),
        coworkings: searchResult.coworkings.map((coworkingResult: any) => ({
            ...coworkingResult,
            id: coworkingResult._id
        }))
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToBusinessArgs>
): Promise<GQLGetBusinessResponse> {
    const query = queries.getMany();
    const bindVars = {userId: event.arguments.userId};
    const returnCount = false;

    try {
        const response = await axiosPost(query, bindVars, returnCount);
        const result = response.data.result[0];
        return mapResult(result);
    } catch (err) {
        console.error(err);
        throw err;
    }
}
