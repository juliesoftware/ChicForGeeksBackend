import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider();

export const handler = async (event: any = {}): Promise<any> => {
    event.request.userAttributes.email = event.request.userAttributes.email.toLowerCase();
    const webClientId: string = process.env.webClientId ?? '';
    const isWebLogin = event.callerContext.clientId === webClientId;
    const email = event.request.userAttributes.email;
    const context = event.request.validationData; // Get the context data from validation data

    if (context && context.origin === 'business' || isWebLogin) {
        console.log("Business sign in for this user: " + email)
        const user = await cognito.adminGetUser({
            UserPoolId: event.userPoolId,
            Username: email, // Now, the Username is actually the email
        }).promise();

        const userGroups = await cognito.adminListGroupsForUser({
            Username: user.Username,
            UserPoolId: event.userPoolId,
        }).promise();

        const userGroupNames = userGroups.Groups?.map((group) => group.GroupName);
        if (!userGroupNames?.includes('CospaceBusiness')) {
            throw new Error('User is not part of the CospaceBusiness group');
        }
    }

    // Return the event if the user is part of the correct group, or if there's no context (or no 'origin' in the context)
    console.log(event.request.userAttributes.email)
    return event;
};
