import { SES } from 'aws-sdk';
import {axiosPost} from "../libs/axiosRequest";
import {AppSyncResolverEvent} from "aws-lambda";
import {MutationToClaimCoworkingArgs} from "../../../../schemas";
import queries from "./queries";

const ses = new SES();

async function getBusinessDetails(businessId: string) {
    const query = queries.business();
    const bindVars = {businessId: businessId};
    const response = await axiosPost(query, bindVars, false)
    return response.data.result[0];
}

async function getCoworkingDetails(coworkingId: string) {
    const query = queries.coworking();
    const bindVars = {coworkingId: coworkingId};
    const response = await axiosPost(query, bindVars, false)
    return response.data.result[0];
}

async function getExistingRelations(businessId: string) {
    const query = queries.getExistingRelations();
    const bindVars = {businessId: businessId};
    const response = await axiosPost(query, bindVars, false)
    return response.data.result;
}

async function sendEmail(business: any, coworkings: any[], relationQuery: string) {
    const params = {
        Destination: {
            ToAddresses: ["help@nomadago.com"],
        },
        Message: {
            Body: {
                Text: { Data: `
                        Business Account: ${business.name} (id: ${business._id}) is trying to claim the following coworkings:
                        ${coworkings.map(coworking => `${coworking.name} (id: ${coworking._id})`).join('\n')}
                        
                        To establish the relations in ArangoDB, please run the following query:
                        ${relationQuery}
                        
                        Do note that already existing coworkings relations have been omitted from the query.
                    `,
                },
            },
            Subject: { Data: `New Business Claim - ${business.name}`,
            },
        },
        Source: "help@nomadago.com", // Replace this with your SES verified email
    };

    await ses.sendEmail(params).promise();
}

export async function handler(
    event: AppSyncResolverEvent<MutationToClaimCoworkingArgs>
): Promise<String> {
    try {
        const request = event.arguments;

        // Fetch business details
        const business = await getBusinessDetails(request.businessId);

        // Fetch coworking details
        const coworkingsPromises = request.coworkingIds.map(id => getCoworkingDetails(id));
        const coworkings = await Promise.all(coworkingsPromises);

        const existingRelations = await getExistingRelations(request.businessId);
        const newCoworkingIds = request.coworkingIds.filter(id => !existingRelations.includes(id));
        const relationQuery = `
            FOR coworkingId IN ${JSON.stringify(newCoworkingIds)}
            INSERT { _from: "${request.businessId}", _to: coworkingId } INTO businessCoworkingRelation
        `;

        // Send email
        await sendEmail(business, coworkings, relationQuery);
        return "SUCCESS"
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to process the claim: ${error}`);
    }
}
