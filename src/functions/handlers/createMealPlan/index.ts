import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

// Create a DynamoDB client
const dynamoDbClient = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

// Define the table name
const TABLE_NAME = process.env.MEAL_PLANS_TABLE || "MealPlans";

interface MealPlanInput {
  name: string;
  type?: string;
  description?: string;
  calories?: number;
  proteins?: number;
  fats?: number;
  carbs?: number;
}

interface MealPlan {
  mealPlanId: string;
  userId: string;
  name: string;
  type?: string;
  description?: string;
  date: string;
  calories?: number;
  proteins?: number;
  fats?: number;
  carbs?: number;
}

// Lambda function handler
export const handler = async (event: any) => {
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

  const mealPlanId = uuidv4();
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
    await dynamoDb.send(new PutCommand(params));

    // Return the mealPlan directly in the response
    return {
      mealPlan: newMealPlan,
    };
  } catch (error) {
    console.error("Error creating meal plan:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
    };
  }
};

