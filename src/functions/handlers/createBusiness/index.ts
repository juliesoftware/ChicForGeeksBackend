import {GQLGetBusinessResponse, MutationToCreateBusinessArgs} from "../../../../schemas";
import {axiosSimplePost} from "../libs/axiosRequest";
import {AppSyncResolverEvent} from "aws-lambda";

function mapResult(business: any): GQLGetBusinessResponse {
    return {
        ...business,
        id: business._id
    };
}

export async function handler(event: AppSyncResolverEvent<MutationToCreateBusinessArgs>):
    Promise<GQLGetBusinessResponse> {
    try {
        const returnNew = true;
        const businessResult = (await axiosSimplePost("document/business", event.arguments.businessInput, returnNew)).data.new
        return mapResult(businessResult);
    } catch (error) {
        throw new Error(`Failed create business: ${error}`);
    }
}
