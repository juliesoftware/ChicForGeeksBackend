import axios from "axios";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

export async function handler(event: any): Promise<any> {
    const now = new Date();
    const query = queries.getAveragePlanCount();
    const bindVars = {currentDate: now};
    const returnCount = true;

    try {
        const averagePlanCount = await axiosPost(query, bindVars, returnCount)

        console.log({
            message: "Average plans per user calculated.",
            averagePlanCount: averagePlanCount.data.result[0]
        });

        return event.data;
    } catch (err) {
        console.error(err);
        throw err;
    }
}
