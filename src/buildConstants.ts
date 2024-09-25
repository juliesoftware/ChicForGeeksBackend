export const defaultPolicies = [
    {
        name: "log-policy",
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Action: [
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                    ],
                    Resource: "arn:aws:logs:*:*:*",
                    Effect: "Allow",
                },
            ],
        }),
    },
    {
        name: "update-user-attribute-policy",
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Action: [
                        "cognito-idp:AdminUpdateUserAttributes"
                    ],
                    Resource: "arn:aws:cognito-idp:*:*:*",
                    Effect: "Allow",
                },
            ],
        }),
    }
];
export const defaultAssumeRolePolicies = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
        {
            Action: "sts:AssumeRole",
            Principal: {
                Service: "appsync.amazonaws.com",
            },
            Effect: "Allow",
        },
        {
            Effect: "Allow",
            Principal: {
                Service: "lambda.amazonaws.com",
            },
            Action: "sts:AssumeRole",
        },
    ],
})
export const SERVICE_PREFIX = "service";
