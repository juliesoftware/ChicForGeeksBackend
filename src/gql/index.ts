import { DataSource, GraphQLApi, Resolver } from "@pulumi/aws/appsync";
import { generateName, generateNameUnderscore, generateTags } from "../utils";
import * as fs from "fs/promises";
import {
  getPolicyDocumentOutput,
  Policy,
  Role,
  RolePolicyAttachment,
} from "@pulumi/aws/iam";
import { LambdaEndpoint } from "../functions";
import * as pulumi from "@pulumi/pulumi";
import * as path from "path";

let PREFIX = "gql";
const config = new pulumi.Config();
const userPoolId = config.require("userPoolId");
const websocketFunctions = [
  "disconnect-channels",
  "connect-channels",
  "send-message",
];

const BASE_RESPONSE = `
#if($ctx.error)
    $util.error($ctx.error.message,$ctx.error.type)
#end
$util.toJson($ctx.result)
`;

const BASE_REQUEST = (isBatch: boolean, field: string) => `
## if is subresolver use $ctx.source as params

#set ($payload = {})

$util.quiet($payload.put("identity", $ctx.identity))

## if args then is subresolver call, use source as args
#if($ctx.args.isEmpty())
    $util.quiet($payload.put("arguments", $ctx.source))
    $util.quiet($payload.put("field", "${field}"))
#else
    $util.quiet($payload.put("arguments", $ctx.args))
#end
#if(!($ctx.info.isEmpty() || $ctx.info.selectionSetList.isEmpty()))
    $util.quiet($payload.put("selectionSetList",$ctx.info.selectionSetList))
#end


$util.quiet($payload.put("request", $ctx.request))
{
    "version" : "2018-05-29",
    "operation": "${isBatch ? "BatchInvoke" : "Invoke"}",
    "payload": $util.toJson($payload)
}
`;

function generateRoleExec() {
  const role = new Role(generateName(PREFIX, "log-role"), {
    assumeRolePolicy: getPolicyDocumentOutput({
      statements: [
        {
          actions: ["sts:AssumeRole"],
          principals: [
            {
              identifiers: ["appsync.amazonaws.com"],
              type: "Service",
            },
          ],
          effect: "Allow",
        },
      ],
    }).json,
    tags: generateTags(PREFIX, "log-role"),
  });

  const policy = new Policy(generateName(PREFIX, "policy"), {
    policy: getPolicyDocumentOutput({
      statements: [
        {
          effect: "Allow",
          actions: ["lambda:invokeFunction"],
          resources: ["arn:aws:lambda:*:640168438272:function:*"],
        },
                {
                    effect: "Allow",
                    actions: ["secretsmanager:GetSecretValue"],
                    resources: ["arn:aws:secretsmanager:*:*:secret:chicforgeeks/*"],
                },

  return role;
}

export default {
  generate: async (
    functions: LambdaEndpoint[],
    appName: string,
  ): Promise<{
    api: GraphQLApi;
  }> => {
    PREFIX = appName;

    let authenticationType: string, authConfig: any;

    if (appName === "gql") {
      authenticationType = "AMAZON_COGNITO_USER_POOLS";
      authConfig = {
        awsRegion: "us-east-1",
        defaultAction: "ALLOW",
        userPoolId: userPoolId,
      };
    } else if (appName === "web") {
      authenticationType = "API_KEY";
      authConfig = {};
    } else {
      throw new Error(`Invalid appName: ${appName}. Expected 'gql' or 'web'.`);
    }

    const api = new GraphQLApi(generateName(PREFIX, "appsync"), {
      authenticationType: authenticationType,
      ...(authenticationType === "AMAZON_COGNITO_USER_POOLS"
        ? { userPoolConfig: authConfig }
        : { apiKeyConfig: authConfig }),
      name: generateName(PREFIX, "chicforgeeks"),
      schema: (
        await fs.readFile(path.join("src", "gql", "schema", "schema.graphql"))
      ).toString("utf-8"),
      tags: generateTags(PREFIX, "appsync"),
      xrayEnabled: true,
    });

    const role = generateRoleExec();
    functions.forEach((fn: LambdaEndpoint) => {
      const fDataSource = new DataSource(
        generateName(PREFIX, `${fn.config.name}-ds`),
        {
          apiId: api.id,
          name: generateNameUnderscore(PREFIX, fn.config.functionName),
          type: "AWS_LAMBDA",
          serviceRoleArn: role.arn,
          lambdaConfig: {
            functionArn: fn.lambda.arn,
          },
        },
      );
      if (fn.config.appsync && !websocketFunctions.includes(fn.config.name)) {
        fn.config.appsync.forEach((appsyncConfig: any) => {
          new Resolver(
            generateName(
              PREFIX,
              `${fn.config.name}-${appsyncConfig.resolver.field}-resolver`,
            ),
            {
              apiId: api.id,
              dataSource: fDataSource.name,
              requestTemplate: BASE_REQUEST(
                appsyncConfig.batch ?? false,
                appsyncConfig.resolver.field,
              ),
              responseTemplate: BASE_RESPONSE,
              ...appsyncConfig.resolver,
            },
          );
        });
      }
    });

    return { api };
  },
};
