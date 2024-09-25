import {axiosDelete, axiosPost} from "../libs/axiosRequest";
import queries from "./queries";

async function deleteCoworking(businessId: string, coworkingId: string): Promise<any> {
    await axiosDelete(`document/${coworkingId}`)
    await axiosPost(
        queries.deleteBusinessToCoworkingRelation(),
        {businessId: businessId, coworkingId: coworkingId},
        false);
}

async function getBusinessDetails(userId: string): Promise<any> {
    const bindVars = {userId: userId};
    const response = await axiosPost(queries.getBusinessDetails(), bindVars, false);
    return response.data.result[0];
}

export async function handler(event: any): Promise<String> {
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

        if ((await axiosPost(queries.userCanDeleteCoworking(), {userId: userId, coworkingId: coworkingId}, false)).data.result.length === 0) {
            throw new Error(`User does not have permission to delete this coworking`);
        }

        const business = await getBusinessDetails(userId);

        await deleteCoworking(business._id, coworkingId);
        return "SUCCESS"
    } catch (error) {
        throw new Error(`Failed to delete the coworking: ${error}`);
    }
}
