import { GQLCoworkingResult} from "../../../../schemas";
import {axiosPost, axiosSimplePost} from "../libs/axiosRequest";
import {SES} from "aws-sdk";
import queries from "./queries";

const ses = new SES();

function mapResult(coworking: any): GQLCoworkingResult {
    return {
        ...coworking,
        id: coworking._id
    };
}

async function createUnverifiedCoworking(coworkingInput: any): Promise<any> {
    const returnNew = true;

    coworkingInput.state = "HIDDEN";
    const response = await axiosSimplePost("document/coworking", coworkingInput, returnNew);
    return response.data.new;
}

async function connectBusinessToCoworking(businessId: string, coworkingId: string): Promise<any> {
    const bindVars = {businessId: businessId, coworkingId: coworkingId};
    await axiosPost(queries.connectBusinessToCoworking(), bindVars, false);
}

async function getBusinessDetails(userId: string): Promise<any> {
    const bindVars = {userId: userId};
    const response = await axiosPost(queries.getBusinessDetails(), bindVars, false);
    return response.data.result[0];
}

async function sendEmail(business: any, coworking: any) {
    const params = {
        Destination: {
            ToAddresses: ["help@nomadago.com"],
        },
        Message: {
            Body: {
                Text: { Data: `
                        Business Account: ${business.name} (id: ${business._id}) is trying to create the following coworking:
                        ${coworking.name} (id: ${coworking._id})
                        
                        Update the coworking state from HIDDEN to VERIFIED.
                    `,
                },
            },
            Subject: { Data: `Coworking Creation Request - ${business.name}`,
            },
        },
        Source: "help@nomadago.com",
    };

    await ses.sendEmail(params).promise();
}

export async function handler(event: any): Promise<GQLCoworkingResult> {
    try {
        const identity = event.identity;
        const userGroups = identity.groups;
        console.log("This is the group: " + userGroups)
        if (!userGroups.includes('CospaceBusiness')) {
            throw new Error('Unauthorized: User does not have permission to create coworkings: Wrong user group');
        }

        const userId = identity.claims['custom:userId'];
        console.log("Requesting user: " + userId)


        const business = await getBusinessDetails(userId);
        const coworkingInput = {...event.arguments.coworkingInput};
        const coworkingCreationResponse = await createUnverifiedCoworking(coworkingInput);

        await connectBusinessToCoworking(business._id, coworkingCreationResponse._id);
        await sendEmail(business, coworkingCreationResponse);
        return mapResult(coworkingCreationResponse);
    } catch (error) {
        throw new Error(`Failed create coworking: ${error}`);
    }
}
