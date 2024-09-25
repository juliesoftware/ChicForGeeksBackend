import {axiosPost} from "../libs/axiosRequest";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {MutationToAddBusinessUserArgs} from "../../../../schemas";

export async function handler(
    event: AppSyncResolverEvent<MutationToAddBusinessUserArgs>
): Promise<String> {
    try {
        const request = event.arguments;
        const bindVars = {
            userId: request.businessUserInput.userId,
            businessId: request.businessUserInput.businessId
        }

        // Send email
        await axiosPost(queries.addUserBusinessRelation(), bindVars, false)
        return "SUCCESS"
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to attach user to business: ${error}`);
    }
}
