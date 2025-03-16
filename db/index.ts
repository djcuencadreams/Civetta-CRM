import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema"; // Usamos schema.ts que contiene interacciones
import * as schemaOriginal from "./schema-original";
import * as newSchema from "./schema-new";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// Usamos schema.ts que contiene interacciones directamente como principal
export const db = drizzle({ client: pool, schema });

// Referencias adicionales por compatibilidad
export const dbOriginal = drizzle({ client: pool, schema: schemaOriginal });
export const dbNew = drizzle({ client: pool, schema: newSchema });