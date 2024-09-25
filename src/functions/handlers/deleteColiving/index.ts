import {axiosDelete, axiosPost} from "../libs/axiosRequest";
import queries from "./queries";

async function deleteColiving(businessId: string, colivingId: string): Promise<any> {
    await axiosDelete(`document/${colivingId}`)
    await axiosPost(
        queries.deleteBusinessToColivingRelation(),
        {businessId: businessId, colivingId: colivingId},
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
            throw new Error('Unauthorized: User does not have permission to modify colivings: Wrong user group');
        }

        const colivingId = event.arguments.colivingId;
        const userId = identity.claims['custom:userId'];
        console.log("Requesting user: " + userId)

        if ((await axiosPost(queries.userCanDeleteColiving(), {userId: userId, colivingId: colivingId}, false)).data.result.length === 0) {
            throw new Error(`User does not have permission to delete this coliving`);
        }

        const business = await getBusinessDetails(userId);

        await deleteColiving(business._id, colivingId);
        return "SUCCESS"
    } catch (error) {
        throw new Error(`Failed to delete the coliving: ${error}`);
    }
}
