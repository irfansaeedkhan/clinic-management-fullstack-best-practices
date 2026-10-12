import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { env } from "#src/config/env.ts";
import * as schema from "./schema/index.ts";
import { dbConfig } from "./db.config.ts";

/**
 * Database instance.
 */
export const db = drizzle({
  ...dbConfig,
  connection: env.DATABASE_URL,
  schema,
});

type DbSchema = typeof schema;
type DbTablesWithRelations = ExtractTablesWithRelations<DbSchema>;
export type Tx = PgTransaction<NodePgQueryResultHKT, DbSchema, DbTablesWithRelations>;
