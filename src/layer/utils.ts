import queries from "../functions/handlers/claimColiving/queries";
import {axiosPost} from "../functions/handlers/libs/axiosRequest";
import {SES} from "aws-sdk";

const ses = new SES();

export async function getBusinessDetails(businessId: string) {
    const query = queries.business();
    const bindVars = {businessId: businessId};
    const response = await axiosPost(query, bindVars, false)
    return response.data.result[0];
}

export async function getColivingDetails(colivingId: string) {
    const query = queries.coliving();
    const bindVars = {colivingId: colivingId};
    const response = await axiosPost(query, bindVars, false)
    return response.data.result[0];
}

export async function getExistingRelations(businessId: string) {
    const query = queries.getExistingRelations();
    const bindVars = {businessId: businessId};
    const response = await axiosPost(query, bindVars, false)
    return response.data.result;
}

export async function sendEmail(business: any, colivings: any[], relationQuery: string) {
    const params = {
        Destination: {
            ToAddresses: ["victorbusk@gmail.com"],
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
        Source: "victorbusk@gmail.com", // Replace this with your SES verified email
    };

    await ses.sendEmail(params).promise();
}