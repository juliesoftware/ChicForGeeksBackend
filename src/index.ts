import gql from "./gql";
import users from "./users";
import functions from "./functions";

async function generateResources() {
    const lambdaEndpoints = await functions();

    const gqlApi = await gql.generate(lambdaEndpoints, "gql");
    const websiteApi = await gql.generate(lambdaEndpoints, "web");


    const userPool = await users.generate();
    const userClient = await users.generateClient(userPool);
    const userDomain = await users.generateDomain(userPool);

    return {
        users: {
            pool: userPool.arn,
            client: userClient.id,
        },
        gql: gqlApi.api.uris,
        website: websiteApi.api.uris
    };
}

export default generateResources();
