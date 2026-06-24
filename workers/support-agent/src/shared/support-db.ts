import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../../src/db/schema';
import type { SupportAgentEnv } from './env';

const { Client } = pg;

export type SupportDb = NodePgDatabase<typeof schema>;

function sanitizeConnectionString(connectionString: string) {
  const url = new URL(connectionString);

  // PlanetScale Postgres may include sslrootcert=system. libpq understands it,
  // node-postgres treats it as a file path. Node uses system CAs already.
  if (url.searchParams.get('sslrootcert') === 'system') {
    url.searchParams.delete('sslrootcert');
  }

  return url.toString();
}

export function getSupportDatabaseUrl(env?: Partial<SupportAgentEnv>) {
  const connectionString =
    env?.HYPERDRIVE?.connectionString ??
    env?.AGENT_DATABASE_URL ??
    env?.DATABASE_URL ??
    process.env.AGENT_DATABASE_URL ??
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('No support-agent database connection string available');
  }

  return sanitizeConnectionString(connectionString);
}

export async function withSupportDb<T>(env: Partial<SupportAgentEnv>, fn: (db: SupportDb) => Promise<T>) {
  const client = new Client({ connectionString: getSupportDatabaseUrl(env) });
  await client.connect();
  try {
    return await fn(drizzle(client, { schema }));
  } finally {
    await client.end();
  }
}
