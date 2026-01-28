import { generateName } from "../utils";
import { UserPool, UserPoolClient, UserPoolDomain } from "@pulumi/aws/cognito";

const PREFIX = "users";

export default {
  generate: async (): Promise<UserPool> => {
    const pool = new UserPool(generateName(PREFIX, "users"), {
      name: generateName(PREFIX, "chicforgeeks"),
      autoVerifiedAttributes: ["email"],
      accountRecoverySetting: {
        recoveryMechanisms: [
          {
            name: "verified_email",
            priority: 1,
          },
          {
            name: "verified_phone_number",
            priority: 2,
          },
        ],
      },
      emailConfiguration: {
        emailSendingAccount: "DEVELOPER",
        fromEmailAddress: "Nomadago <help@nomadago.com>",
        sourceArn:
          "arn:aws:ses:us-east-1:292274522756:identity/help@nomadago.com",
      },
      emailVerificationSubject: "Verify your email on Nomadago",
      emailVerificationMessage:
        "Welcome to Nomadago!<br/><br/>To complete to the sign up process, please verify your email using the code below.<br/><br/>{####}",
      passwordPolicy: {
        minimumLength: 8,
        requireLowercase: true,
        requireNumbers: true,
        temporaryPasswordValidityDays: 7,
      },
      usernameAttributes: ["email"],
      schemas: [
        {
          attributeDataType: "String",
          name: "userId",
          mutable: true,
        },
      ],
      lambdaConfig: {
        postConfirmation:
          "arn:aws:lambda:us-east-1:292274522756:function:dev2-service-confirmation",
        preSignUp:
          "arn:aws:lambda:us-east-1:292274522756:function:dev2-service-confirmation-pre",
      },
    });

    return pool;
  },
};
