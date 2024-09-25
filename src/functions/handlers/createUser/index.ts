import {GQLUser} from "../../../../schemas";
import queries from "./queries";
import {axiosPost, axiosSimplePost} from "../libs/axiosRequest";
import {CognitoIdentityServiceProvider} from "aws-sdk"; // Import AWS SDK

const cognito = new CognitoIdentityServiceProvider();

function mapResult(user: any): GQLUser {
    console.log(user)
    return {
        ...user,
        id: user._id,
    };
}

export async function handler(
    event: any
): Promise<GQLUser> {
    console.log(event)
    const userPoolId: string = process.env.userPool ?? '';
    const returnCount = false;
    const returnNew = true;

    const user = (await axiosPost(
        queries.findUserByUsername(),
        { username: event.arguments.username.toLowerCase() },
        returnCount
    )).data;

    if (user.result.length > 0) {
        throw new Error("Username already in use");
    }

    event.arguments.visitedCountries = event.arguments.visitedCountries ?? [];
    const newUser = (await axiosSimplePost("document/user", event.arguments, returnNew)).data.new;

    // Update the Cognito user attributes
    const updateParams = {
        UserAttributes: [
            {
                Name: "preferred_username",
                Value: event.arguments.username
            },
            {
                Name: "custom:userId",
                Value: newUser._id
            }
        ],
        UserPoolId: userPoolId, // replace with your User Pool ID
        Username: event.identity.username // assuming you have the username in the event identity
    };
    console.log(updateParams)
    await cognito.adminUpdateUserAttributes(updateParams).promise();
    console.log("User updated")

    return mapResult(newUser);
}
