import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

export async function handler(event: any): Promise<any> {
    const userCount = (await axiosPost(queries.userCount(), {}, false)).data.result[0]

    console.log({
        message: "User count retrieved",
        userCount: userCount
    });

    return event;
}
