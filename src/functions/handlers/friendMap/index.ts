import {GQLGetUsersResponse, QueryToFriendMapArgs,} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(user: any): GQLGetUsersResponse {
    return {
        ...user.user,
        id: user.user._id,
        location: user.location
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToFriendMapArgs>
): Promise<GQLGetUsersResponse> {

    const mapFilter = event.arguments?.mapFilter ?? {
        boundingBox: [
            [53.3381706, -6.0198985],
            [53.3381706, -6.0198985],
            [53.3381706, -6.0198985],
            [53.3381706, -6.0198985],
        ],
    };
    const query = queries.mapView(mapFilter);
    const bindVars = {user: event.arguments.userId}
    const returnCount = true;

    const response = await axiosPost(query, bindVars, returnCount)

    return {
        results: response.data.result.map(mapResult),
    };
}
