import { SES } from 'aws-sdk';
import {axiosPost} from "../libs/axiosRequest";
import {AppSyncResolverEvent} from "aws-lambda";
import {MutationToClaimColivingArgs} from "../../../../schemas";
import queries from "./queries";

const ses = new SES();

async function getBusinessDetails(businessId: string) {
    const query = queries.business();
    const bindVars = {businessId: businessId};
    const response = await axiosPost(query, bindVars, false)
    return response.data.result[0];
}

async function getColivingDetails(colivingId: string) {
    const query = queries.coliving();
    const bindVars = {colivingId: colivingId};
    const response = await axiosPost(query, bindVars, false)
    return response.data.result[0];
}

async function getExistingRelations(businessId: string) {
    const query = queries.getExistingRelations();
    const bindVars = {businessId: businessId};
    const response = await axiosPost(query, bindVars, false)
    return response.data.result;
}

async function sendEmail(business: any, colivings: any[], relationQuery: string) {
    const params = {
        Destination: {
            ToAddresses: ["help@nomadago.com"],
        },
        Message: {
            Body: {
                Text: { Data: `
                        Business Account: ${business.name} (id: ${business._id}) is trying to claim the following colivings:
                        ${colivings.map(coliving => `${coliving.name} (id: ${coliving._id})`).join('\n')}
                        
                        To establish the relations in ArangoDB, please run the following query:
                        ${relationQuery}
                        
                        Do note that already existing colivings relations have been omitted from the query.
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
    event: AppSyncResolverEvent<MutationToClaimColivingArgs>
): Promise<String> {
    try {
        const request = event.arguments;

        // Fetch business details
        const business = await getBusinessDetails(request.businessId);

        // Fetch coliving details
        const colivingsPromises = request.colivingIds.map(id => getColivingDetails(id));
        const colivings = await Promise.all(colivingsPromises);

        const existingRelations = await getExistingRelations(request.businessId);
        const newColivingIds = request.colivingIds.filter(id => !existingRelations.includes(id));
        const relationQuery = `
            FOR colivingId IN ${JSON.stringify(newColivingIds)}
            INSERT { _from: "${request.businessId}", _to: colivingId } INTO businessColivingRelation
        `;

        // Send email
        await sendEmail(business, colivings, relationQuery);
        return "SUCCESS"
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to process the claim: ${error}`);
    }
}
