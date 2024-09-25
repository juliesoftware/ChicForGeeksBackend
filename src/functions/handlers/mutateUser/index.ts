import {GQLUser, MutationToUpdateUserArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPatch, axiosPost, axiosSimplePost} from "../libs/axiosRequest";

function mapResult(user: any, loc: any): Promise<GQLUser> {
    return {
        ...user,
        id: user._id,
        location: loc
    };
}

export async function handler(
    event: AppSyncResolverEvent<MutationToUpdateUserArgs>
): Promise<GQLUser> {
    const returnCount = false;
    const returnNew = true;
    const data = (await axiosPost(queries.single(), {user: event.arguments.userId}, returnCount)).data

    const user = {...event.arguments.userInput};
    if (!event.arguments.userInput?.notificationRange) {
        user.notificationRange = 100;
    }
    let userData;
    if (data.result.length == 0) {
        userData = (await axiosSimplePost("document/user", user, returnNew)).data.new
    } else {
        userData = (await axiosPatch(`document/user/${data.result[0].user._key}`, event.arguments.userInput, returnNew)).data.new
    }
    const location = (await axiosPost(queries.location(), {user: event.arguments.userId}, false)).data
    let loc;
    if (location.result.length == 0) {
        loc = null;
    } else {
        loc = location.result[0];
    }
    return mapResult(userData, loc);

}
