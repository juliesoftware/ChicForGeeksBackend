import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

export async function handler(event: any): Promise<any> {
    let query = queries.friendCount();
    const bindVars = {};
    const returnCount = true;

    const response = await axiosPost(query, bindVars, returnCount);
    const friendCounters = response.data.result[0];

    console.log({
        message: "Friend count retrieved",
        numberOfUsersWith15OrMoreFriends: friendCounters.numberOfUsersWith15OrMoreFriends,
        percentageOfUsersWith15OrMoreFriends: friendCounters.percentageOfUsersWith15OrMoreFriends
    });

    return event;
}
