import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  comingSoonPgPool?: Pool;
};

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPool() {
  if (!globalForDb.comingSoonPgPool) {
    globalForDb.comingSoonPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      allowExitOnIdle: true,
    });
  }
  return globalForDb.comingSoonPgPool;
}
