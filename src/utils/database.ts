// This import loads the `.env` file as environment variables
import "jsr:@std/dotenv/load";
import { Db, MongoClient } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { generate } from "jsr:@std/uuid/unstable-v7";

async function initMongoClient() {
  const DB_CONN = Deno.env.get("MONGODB_URL");
  if (DB_CONN === undefined) {
    throw new Error("Could not find environment variable: MONGODB_URL");
  }
  // Log connection info (without sensitive data)
  const connInfo = DB_CONN.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"); // Mask credentials
  console.log(`[DB] Connecting to MongoDB: ${connInfo}`);
  const client = new MongoClient(DB_CONN);
  try {
    await client.connect();
    console.log("[DB] MongoDB connection established successfully");
  } catch (e) {
    console.error("[DB] MongoDB connection failed:", e);
    throw new Error("MongoDB connection failed: " + e);
  }
  return client;
}

async function init() {
  const client = await initMongoClient();
  const DB_NAME = Deno.env.get("DB_NAME");
  if (DB_NAME === undefined) {
    throw new Error("Could not find environment variable: DB_NAME");
  }
  
  // Check if connection string has a database name
  const DB_CONN = Deno.env.get("MONGODB_URL") || "";
  const urlMatch = DB_CONN.match(/mongodb[+srv]*:\/\/[^/]+\/([^?]+)/);
  if (urlMatch && urlMatch[1]) {
    const connStringDbName = urlMatch[1];
    if (connStringDbName !== DB_NAME) {
      console.warn(`[DB] WARNING: Connection string database '${connStringDbName}' differs from DB_NAME '${DB_NAME}'. Using DB_NAME.`);
    }
  }
  
  console.log(`[DB] Using database name: ${DB_NAME}`);
  return [client, DB_NAME] as [MongoClient, string];
}

async function dropAllCollections(db: Db): Promise<void> {
  try {
    // Get all collection names
    const collections = await db.listCollections().toArray();

    // Drop each collection
    for (const collection of collections) {
      await db.collection(collection.name).drop();
    }
  } catch (error) {
    console.error("Error dropping collections:", error);
    throw error;
  }
}

/**
 * MongoDB database configured by .env
 * @returns {[Db, MongoClient]} initialized database and client
 */
export async function getDb() {
  const [client, DB_NAME] = await init();
  const db = client.db(DB_NAME);
  
  // Verify connection and log collection info
  try {
    const collections = await db.listCollections().toArray();
    console.log(`[DB] Database '${DB_NAME}' has ${collections.length} collections:`, 
      collections.map(c => c.name).join(", ") || "(none)");
    
    // Log document counts for key collections
    const keyCollections = ["UserAuthentication_users", "ItemListing_listings"];
    for (const collName of keyCollections) {
      try {
        const count = await db.collection(collName).countDocuments();
        console.log(`[DB] Collection '${collName}': ${count} documents`);
      } catch (e) {
        // Collection might not exist yet, that's okay
        console.log(`[DB] Collection '${collName}': (does not exist)`);
      }
    }
  } catch (e) {
    console.error("[DB] Error listing collections:", e);
  }
  
  return [db, client] as [Db, MongoClient];
}

/**
 * Test database initialization
 * @returns {[Db, MongoClient]} initialized test database and client
 */
export async function testDb() {
  const [client, DB_NAME] = await init();
  const test_DB_NAME = `test-${DB_NAME}`;
  const test_Db = client.db(test_DB_NAME);
  await dropAllCollections(test_Db);
  return [test_Db, client] as [Db, MongoClient];
}

/**
 * Creates a fresh ID.
 * @returns {ID} UUID v7 generic ID.
 */
export function freshID() {
  return generate() as ID;
}
