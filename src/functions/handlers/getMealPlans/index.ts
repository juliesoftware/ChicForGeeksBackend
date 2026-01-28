import { connectToDatabase } from "../../../layer/mongodb";

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
export const handler = async (event: any) => {
  const userId = event.arguments.userId;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing required field: userId",
      }),
    };
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection("mealPlans");

    // Query meal plans by userId
    const mealPlans = await collection
      .find({ userId })
      .sort({ date: -1 }) // Sort by date, newest first
      .toArray();

    // Log the result for debugging
    console.log("MongoDB query result:", mealPlans);

    return {
      statusCode: 200,
      body: JSON.stringify({
        mealPlans: mealPlans, // Return the mealPlans as a list
      }),
    };
  } catch (error) {
    console.error("Error retrieving meal plans:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
    };
  }
};
