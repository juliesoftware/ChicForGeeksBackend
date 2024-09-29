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
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
// Create a DynamoDB client
const dynamoDbClient = new client_dynamodb_1.DynamoDBClient({});
const dynamoDb = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoDbClient);
// Define the table name
const TABLE_NAME = process.env.MEAL_PLANS_TABLE || "MealPlans";
// Lambda function handler
const handler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, mealPlanInput } = event.arguments;
    const { name, type, description, calories, proteins, fats, carbs } = mealPlanInput;
    if (!userId || !name) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Missing required fields: userId or name",
            }),
        };
    }
    const mealPlanId = (0, uuid_1.v4)();
    const date = new Date().toISOString();
    const newMealPlan = {
        mealPlanId,
        userId,
        name,
        type: type || "LUNCH",
        description: description || "",
        date,
        calories: calories || 0,
        proteins: proteins || 0,
        fats: fats || 0,
        carbs: carbs || 0,
    };
    const params = {
        TableName: TABLE_NAME,
        Item: newMealPlan,
    };
    try {
        yield dynamoDb.send(new lib_dynamodb_1.PutCommand(params));
        // Return the mealPlan directly in the response
        return {
            mealPlan: newMealPlan,
        };
    }
    catch (error) {
        console.error("Error creating meal plan:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error",
            }),
        };
    }
});
exports.handler = handler;
//# sourceMappingURL=index.js.map