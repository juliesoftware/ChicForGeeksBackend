import {CognitoIdentityServiceProvider} from "aws-sdk";
import queries from "./queries";
import {axiosInsert, axiosPatch, axiosPost} from "../libs/axiosRequest";

const cisProvider = new CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});

export async function handler(event: any): Promise<any> {
    event.request.userAttributes.email = event.request.userAttributes.email.toLowerCase();

    if (event.triggerSource == "PostConfirmation_ConfirmSignUp" && event.request.userAttributes.preferred_username) {
        let query = queries.findUserByEmail(event.userName, event.request.userAttributes.email);
        const bindVars = {};
        const returnCount = true;

        let user = await axiosPost(query, bindVars, returnCount);

        const userJson = {
            name: event.request.userAttributes.name,
            email: event.request.userAttributes.email,
            username: event.request.userAttributes.preferred_username,
            created_at: new Date().toISOString(),
            visitedCountries: []
        };

        if (!(user.data.result.length > 0)) {
            const userUrl = "document/user";
            user = await axiosInsert(userUrl, userJson)
        } else {
            const userPatchUrl = `document/user/${user.data.result[0]._key}`;
            user = await axiosPatch(userPatchUrl, userJson)
        }
        const params = {
            UserPoolId: event.userPoolId,
            Username: event.userName,
            UserAttributes:  // this parameter needs to be an array
                [
                    {
                        Name: 'custom:userId',
                        Value: user.data._id
                    }
                ]
        };

        if (event.request.userAttributes.email) {
            await cisProvider
                .adminUpdateUserAttributes(params)
                .promise();

        }
    }
    return event;
}
