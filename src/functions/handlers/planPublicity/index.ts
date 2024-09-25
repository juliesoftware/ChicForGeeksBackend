import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

export async function handler(event: any): Promise<any> {
    let planDistribution = (await axiosPost(queries.planPublicity(), {}, false)).data.result[0]

    console.log({
        message: "Plan distribution calculated",
        privatePercentage: planDistribution.privatePercentage,
        publicPercentage: planDistribution.publicPercentage
    });

    return event;
}
