import { GQLColivingResult} from "../../../../schemas";
import {axiosPatch, axiosPost} from "../libs/axiosRequest";
import queries from "./queries";

function mapResult(coliving: any): GQLColivingResult {
    return {
        ...coliving,
        id: coliving._id
    };
}

async function updateColiving(colivingId: string, colivingInput: any): Promise<any> {
    const returnNew = true;
    const response = await axiosPatch(`document/${colivingId}`, colivingInput, returnNew);
    return response.data.new;
}

export async function handler(event: any): Promise<GQLColivingResult> {
    try {
        const identity = event.identity;
        const userGroups = identity.groups;
        console.log("This is the group: " + userGroups)
        if (!userGroups.includes('CospaceBusiness')) {
            throw new Error('Unauthorized: User does not have permission to modify colivings: Wrong user group');
        }

        const colivingId = event.arguments.colivingId;
        const userId = identity.claims['custom:userId'];
        console.log("Requesting user: " + userId)

        if ((await axiosPost(queries.userCanEditColiving(), {userId: userId, colivingId: colivingId}, false)).data.result.length === 0) {
            throw new Error(`User does not have permission to edit this coliving`);
        }

        const colivingInput = {...event.arguments.colivingInput};
        const colivingMutationResponse = await updateColiving(colivingId, colivingInput);
        return mapResult(colivingMutationResponse);
    } catch (error) {
        throw new Error(`Failed to update the coliving: ${error}`);
    }
}
