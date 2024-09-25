import {AppSyncResolverEvent} from "aws-lambda";
import {CognitoIdentityServiceProvider} from "aws-sdk";
import {MutationToUnlinkIdpArgs} from "../../../../schemas";

const cognitoClient = new CognitoIdentityServiceProvider({ region: 'us-east-1' });

export async function handler(
    event: AppSyncResolverEvent<MutationToUnlinkIdpArgs>
): Promise<String> {
    const userPoolId: string = process.env.userPool ?? '';

    try {
        await cognitoClient.adminDisableProviderForUser({
            UserPoolId: userPoolId,
            User: {
                ProviderName: event.arguments.providerName,
                ProviderAttributeName: 'Cognito_Subject',
                ProviderAttributeValue: event.arguments.idpUserId,
            },
        }).promise();

        return "SUCCESS"
    } catch (error) {
        console.error(error);
        throw new Error(`Error unlinking IdP: ${error}`);
    }
}
