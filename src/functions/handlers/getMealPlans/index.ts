import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// Create DynamoDB client
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

// Define the table name
const TABLE_NAME = process.env.MEAL_PLANS_TABLE || 'MealPlans';

interface MealPlan {
    mealPlanId: string;
    userId: string;
    name: string;
    type: string;
    description: string;
    date: string;
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
}

// Lambda function handler
exports.handler = async (event: any) => {
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
        const params: QueryCommandInput = {
            TableName: TABLE_NAME,
            IndexName: 'UserIdIndex', // Ensure this GSI exists
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: {
                ':uid': { S: userId }
            }
        };

        const command = new QueryCommand(params);
        const result = await dynamoDb.send(command);

        // Log the raw result for debugging
        console.log("DynamoDB query result:", result);

        const mealPlans: MealPlan[] = (result.Items || []).map((item) =>
            unmarshall(item) as MealPlan
        );

        // Log the unmarshalled meal plans for debugging
        console.log("Unmarshalled meal plans:", mealPlans);

        return {
            statusCode: 200,
            body: JSON.stringify({
                mealPlans: mealPlans // Return the mealPlans as a list
            })
        };

    } catch (error) {
        console.error('Error retrieving meal plans:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error"
            })
        };
    }
};
