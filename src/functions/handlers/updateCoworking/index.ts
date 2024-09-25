import { GQLCoworkingResult} from "../../../../schemas";
import {axiosPatch, axiosPost} from "../libs/axiosRequest";
import queries from "./queries";

function mapResult(coworking: any): GQLCoworkingResult {
    return {
        ...coworking,
        id: coworking._id
    };
}

async function updateCoworking(coworkingId: string, coworkingInput: any): Promise<any> {
    const returnNew = true;
    const response = await axiosPatch(`document/${coworkingId}`, coworkingInput, returnNew);
    return response.data.new;
}

export async function handler(event: any): Promise<GQLCoworkingResult> {
    try {
        const identity = event.identity;
        const userGroups = identity.groups;
        console.log("This is the group: " + userGroups)
        if (!userGroups.includes('CospaceBusiness')) {
            throw new Error('Unauthorized: User does not have permission to modify coworkings: Wrong user group');
        }

        const coworkingId = event.arguments.coworkingId;
        const userId = identity.claims['custom:userId'];
        console.log("Requesting user: " + userId)

        if ((await axiosPost(queries.userCanEditCoworking(), {userId: userId, coworkingId: coworkingId}, false)).data.result.length === 0) {
            throw new Error(`User does not have permission to edit this coworking`);
        }

        const coworkingInput = {...event.arguments.coworkingInput};
        const coworkingMutationResponse = await updateCoworking(coworkingId, coworkingInput);
        return mapResult(coworkingMutationResponse);
    } catch (error) {
        throw new Error(`Failed to update the coworking: ${error}`);
    }
}
