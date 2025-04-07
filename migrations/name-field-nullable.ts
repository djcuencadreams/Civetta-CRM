/**
 * Migration to make the name field in the customers table nullable
 * This is the first step in removing the redundancy between name and firstName/lastName fields
 */

import { sql } from "drizzle-orm";
import { db } from "../db";

export async function makeNameFieldNullable() {
  console.log("🔄 Starting migration: Make name field nullable");
  
  try {
    // Add a database transaction to ensure all operations succeed or fail together
    await db.transaction(async (tx) => {
      // 1. Make the name column nullable
      await tx.execute(sql`
        ALTER TABLE customers 
        ALTER COLUMN name DROP NOT NULL;
      `);
      
      // 2. Update all customer records to ensure name field is consistent with firstName + lastName
      await tx.execute(sql`
        UPDATE customers 
        SET name = TRIM(first_name || ' ' || last_name)
        WHERE first_name IS NOT NULL AND last_name IS NOT NULL;
      `);
      
      console.log("✅ Migration successful: name field is now nullable and all names are synchronized");
    });
    
    return {
      success: true,
      message: "Name field made nullable successfully"
    };
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return {
      success: false,
      message: "Error making name field nullable",
      error
    };
  }
}