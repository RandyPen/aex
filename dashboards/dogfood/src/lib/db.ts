import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

export function getPool(): Pool | null {
  if (!connectionString) return null;
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return global.__pgPool;
}

export const HAS_DB = Boolean(connectionString);
