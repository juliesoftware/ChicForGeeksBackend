import {GQLUser, QueryToUserArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

async function mapResult(user: any): Promise<GQLUser> {
    return {
        ...user,
        id: user._id
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToUserArgs>
): Promise<GQLUser> {
    console.log(event);

    const query = queries.byIdOrUsername();
    const bindVars = {
        requesterId: event.arguments.requesterId ?? null,
        requesteeId: event.arguments.userId ?? null,
        username: event.arguments.userName ?? null
    };

    const response = await axiosPost(query, bindVars, false)
    return mapResult(response.data.result[0])
}
