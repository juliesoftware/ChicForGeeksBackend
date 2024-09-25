import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

export async function handler(event: any): Promise<any> {
    await axiosPost(queries.runJob(), {}, false)

    console.log({
        message: "Visited countries updated for all users"
    });

    return event;
}
