import gql from "./gql";
import functions from "./functions";

async function generateResources() {
    const lambdaEndpoints = await functions();

    const gqlApi = await gql.generate(lambdaEndpoints, "gql");

    return {
        gql: gqlApi.api.uris
    };
}

export default generateResources();
