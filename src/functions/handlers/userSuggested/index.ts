import {GQLGetUsersResponse, GQLUser, QueryToUserSuggestedArgs,} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {CursorData, getRemainingCount, validateAndPrepareCursorData} from "../libs/cursor";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToUserSuggestedArgs>
): Promise<GQLGetUsersResponse> {
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);

    console.log({
        message: "Suggested user has been invoked",
        userId: event.arguments.userId
    });

    const response = await axiosPost(queries.all(cursor), {userId: event.arguments.userId}, true)
    let friendsOfFriendsResult = response.data.result.map(mapResult);

    cursor.count = getRemainingCount(cursor.count ?? 0, friendsOfFriendsResult.length);
    if (cursor.count == 0) {
        return {results: friendsOfFriendsResult};
    }

    const locationResult = (await axiosPost(queries.suggestionByLocation(cursor), {userId: event.arguments.userId}, true)).data.result.map(mapResult)

    friendsOfFriendsResult = friendsOfFriendsResult.concat(locationResult);
    cursor.count = getRemainingCount(cursor.count ?? 0, friendsOfFriendsResult.length);
    if (cursor.count == 0) {
        return {results: friendsOfFriendsResult};
    }

    let randomUserResult = (await axiosPost(queries.randomUser(cursor), {userId: event.arguments.userId}, true)).data.result.map(mapResult)
    friendsOfFriendsResult = friendsOfFriendsResult.concat(randomUserResult);
    return {results: friendsOfFriendsResult};
}
