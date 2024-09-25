import {GQLGetUsersResponse, GQLUser, QueryToJoinArgs,} from "../../../../schemas";
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
    event: AppSyncResolverEvent<QueryToJoinArgs>
): Promise<GQLGetUsersResponse> {

    const returnCount = false;
    let query = queries.findJoined();
    switch (event.arguments.joinType) {
        case 'JOINED':
            query = queries.findJoined();
            break;
        case 'REQUESTED':
            query = queries.findRequested();
            break;
        case 'INVITED':
            query = queries.findInvited();
            break;
    }
    let querystring = event.arguments?.query ?? '';
    const bindVars = {plan: event.arguments.planId, query: querystring};

    const response = await axiosPost(query, bindVars, returnCount)
    return {results: response.data.result.map(mapResult)};
}
