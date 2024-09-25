import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";
import {CognitoIdentityServiceProvider} from "aws-sdk";

const cognitoClient = new CognitoIdentityServiceProvider({ region: 'us-east-1' });

async function getCognitoUser(userPoolId: string, username: string): Promise<CognitoIdentityServiceProvider.AdminGetUserResponse | null> {
    try {
        const user = await cognitoClient.adminGetUser({UserPoolId: userPoolId, Username: username}).promise();
        return user;
    } catch (error) {
        if ((error as any).code === 'UserNotFoundException') {
            return null;
        }
        throw error;
    }
}

async function throwIfExistingEmail(userPoolId: string, email: string): Promise<void> {
    const params = {
        UserPoolId: userPoolId,
        Filter: `email = "${email}"`,
        Limit: 1
    };

    const response = await cognitoClient.listUsers(params).promise();
    if(response.Users && response.Users.length > 0) {
        const existingUser = response.Users[0];
        if (existingUser.Username?.startsWith("Google") ?? false) {
            throw new Error("Email is linked to Google");
        }
        if (existingUser.UserStatus === "UNCONFIRMED") {
            // If the user is unconfirmed, delete that user.
            const deleteParams = {
                UserPoolId: userPoolId,
                Username: email
            };
            await cognitoClient.adminDeleteUser(deleteParams).promise();
        } else {
            throw new Error("Email already in use");
        }
    }
}

async function confirmCognitoUser(userPoolId: string, username: string): Promise<void> {
    const params = {
        UserPoolId: userPoolId,
        Username: username
    };
    await cognitoClient.adminConfirmSignUp(params).promise();
}

export async function handler(event: any): Promise<any> {
    console.log(event);
    const externalProviderSource = "PreSignUp_ExternalProvider";
    const triggerSource = event.triggerSource;
    const userAttributes = event.request.userAttributes;
    let email = userAttributes['email'];

    try {
        const user = await getCognitoUser(event.userPoolId, email);

        if (triggerSource === externalProviderSource) {
            if (user && user.UserAttributes) {
                console.log(user.UserAttributes);
                console.log("sub: " + user.UserAttributes.find(attr => attr.Name === 'sub')?.Value);
                const [providerNameValue, providerUserId] = event.userName.split('_');
                const providerName =
                    providerNameValue.charAt(0).toUpperCase() + providerNameValue.slice(1);
                // Link the Google identity to the existing Cognito user
                const params = {
                    UserPoolId: event.userPoolId,
                    DestinationUser: {
                        ProviderAttributeValue: user.UserAttributes.find(attr => attr.Name === 'sub')?.Value,
                        ProviderName: 'Cognito'
                    },
                    SourceUser: {
                        ProviderAttributeName: 'Cognito_Subject',
                        ProviderAttributeValue: providerUserId,
                        ProviderName: providerName
                    }
                }

                await cognitoClient.adminLinkProviderForUser(params).promise();

                // If the user is unconfirmed, confirm them.
                if (user.UserStatus === "UNCONFIRMED") {
                    await confirmCognitoUser(event.userPoolId, email);
                }
            } else {
                // Log that a new user is being created through Google IdP
                console.log("New user created");
            }

            return event;
        }

        await throwIfExistingEmail(event.userPoolId, email);

        if (event.request.userAttributes.preferred_username) {
            const user = (await axiosPost(queries.findUserByUsername(event.request.userAttributes.preferred_username.toLowerCase()), {}, false)).data;

            if (user.result.length > 0) {
                throw new Error("Username already in use");
            }
        }

        console.log("New user created");
        return event;
    } catch (error) {
        if (error instanceof Error) {
            console.error("An error occurred:", error.message);
        } else {
            console.error("An unknown error occurred:", error);
        }
        throw error;
    }
}