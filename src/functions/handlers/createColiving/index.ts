import { GQLColivingResult} from "../../../../schemas";
import {axiosPost, axiosSimplePost} from "../libs/axiosRequest";
import {SES} from "aws-sdk";
import queries from "./queries";

const ses = new SES();

function mapResult(coliving: any): GQLColivingResult {
    return {
        ...coliving,
        id: coliving._id
    };
}

async function createUnverifiedColiving(colivingInput: any): Promise<any> {
    const returnNew = true;

    colivingInput.state = "HIDDEN";
    const response = await axiosSimplePost("document/coliving", colivingInput, returnNew);
    return response.data.new;
}

async function connectBusinessToColiving(businessId: string, colivingId: string): Promise<any> {
    const bindVars = {businessId: businessId, colivingId: colivingId};
    await axiosPost(queries.connectBusinessToColiving(), bindVars, false);
}

async function getBusinessDetails(userId: string): Promise<any> {
    const bindVars = {userId: userId};
    const response = await axiosPost(queries.getBusinessDetails(), bindVars, false);
    return response.data.result[0];
}

async function sendEmail(business: any, coliving: any) {
    const params = {
        Destination: {
            ToAddresses: ["help@nomadago.com"],
        },
        Message: {
            Body: {
                Text: { Data: `
                        Business Account: ${business.name} (id: ${business._id}) is trying to create the following coliving:
                        ${coliving.name} (id: ${coliving._id})
                        
                        Update the coliving state from HIDDEN to VERIFIED.
                    `,
                },
            },
            Subject: { Data: `Coliving Creation Request - ${business.name}`,
            },
        },
        Source: "help@nomadago.com",
    };

    await ses.sendEmail(params).promise();
}

export async function handler(event: any): Promise<GQLColivingResult> {
    try {
        const identity = event.identity;
        const userGroups = identity.groups;
        console.log("This is the group: " + userGroups)
        if (!userGroups.includes('CospaceBusiness')) {
            throw new Error('Unauthorized: User does not have permission to create colivings: Wrong user group');
        }

        const userId = identity.claims['custom:userId'];
        console.log("Requesting user: " + userId)


        const business = await getBusinessDetails(userId);
        const colivingInput = {...event.arguments.colivingInput};
        const colivingCreationResponse = await createUnverifiedColiving(colivingInput);

        await connectBusinessToColiving(business._id, colivingCreationResponse._id);
        await sendEmail(business, colivingCreationResponse);
        return mapResult(colivingCreationResponse);
    } catch (error) {
        throw new Error(`Failed create coliving: ${error}`);
    }
}
