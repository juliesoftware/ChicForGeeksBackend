import { MongoClient, Db } from "mongodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

let cachedDb: Db | null = null;
let cachedClient: MongoClient | null = null;

async function getMongoConnectionString(): Promise<string> {
  // Check if running locally
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  // Get from AWS Secrets Manager
  const secretsClient = new SecretsManagerClient({
    region: process.env.AWS_REGION || "us-east-1",
  });
  const secretName = process.env.MONGODB_SECRET_NAME || "chicforgeeks/mongodb";

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );

    if (response.SecretString) {
      const secret = JSON.parse(response.SecretString);
      return secret.MONGODB_URI;
    }

    throw new Error("Secret string not found");
  } catch (error) {
    console.error("Error retrieving MongoDB connection string:", error);
    throw error;
  }
}

export async function connectToDatabase(): Promise<Db> {
  // Return cached connection if available
  if (cachedDb && cachedClient) {
    return cachedDb;
  }

  const connectionString = await getMongoConnectionString();
  const dbName = process.env.MONGODB_DB_NAME || "chicforgeeks";

  // Create new connection
  const client = new MongoClient(connectionString, {
    maxPoolSize: 10, // Limit connections for Lambda
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  const db = client.db(dbName);

  // Cache for reuse
  cachedClient = client;
  cachedDb = db;

  return db;
}

export async function closeDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}
