import {CognitoIdentityServiceProvider} from "aws-sdk";
import {AppSyncResolverEvent} from "aws-lambda";
import {QueryToIsExistingIdpArgs} from "../../../../schemas";

const cognitoClient = new CognitoIdentityServiceProvider({ region: 'us-east-1' });

export async function handler(
    event: AppSyncResolverEvent<QueryToIsExistingIdpArgs>
): Promise<Boolean> {
    const userPoolId: string = process.env.userPool ?? '';
    let email = event.arguments.email;

    try {
        const params = {
            UserPoolId: userPoolId,
            Filter: `email = "${email}"`,
            Limit: 1
        };

        const response = await cognitoClient.listUsers(params).promise();
        if(response.Users && response.Users.length > 0) {
            return response.Users[0].UserStatus === 'EXTERNAL_PROVIDER'
        }
        return false
    } catch (error) {
        console.error('Error finding user by email:', error);
        throw error;
    }
}
