"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
// Create DynamoDB client
const client = new client_dynamodb_1.DynamoDBClient({});
const dynamoDb = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
// Define the table name
const TABLE_NAME = process.env.MEAL_PLANS_TABLE || 'MealPlans';
// Lambda function handler
exports.handler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = event.arguments.userId;
    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Missing required field: userId"
            })
        };
    }
    try {
        const params = {
            TableName: TABLE_NAME,
            IndexName: 'UserIdIndex',
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: {
                ':uid': { S: userId }
            }
        };
        const command = new client_dynamodb_1.QueryCommand(params);
        const result = yield dynamoDb.send(command);
        // Log the raw result for debugging
        console.log("DynamoDB query result:", result);
        const mealPlans = (result.Items || []).map((item) => (0, util_dynamodb_1.unmarshall)(item));
        // Log the unmarshalled meal plans for debugging
        console.log("Unmarshalled meal plans:", mealPlans);
        return {
            statusCode: 200,
            body: JSON.stringify({
                mealPlans: mealPlans // Return the mealPlans as a list
            })
        };
    }
    catch (error) {
        console.error('Error retrieving meal plans:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error"
            })
        };
    }
});
//# sourceMappingURL=index.js.map