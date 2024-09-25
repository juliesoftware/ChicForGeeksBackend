import {GQLGetUsersResponse, GQLUser, QueryToMutualFriendsArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToMutualFriendsArgs>
): Promise<GQLGetUsersResponse> {
    console.log({
        message: "Mutual friends has been invoked",
        requester: event.arguments.requester,
        requestee: event.arguments.requestee
    });

    try {
        const response = await axiosPost(queries.all(), {
            requester: event.arguments.requester,
            requestee: event.arguments.requestee
        }, false)

        return {results: response.data.result[0].map(mapResult)}
    } catch (error) {
        throw new Error("Failed search mutual friends: " + error);
    }
}
