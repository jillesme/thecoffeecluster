import pg from 'pg';
import type { SupportAgentEnv } from './env';

const { Client } = pg;

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
    env?.AGENT_DATABASE_URL ?? env?.HYPERDRIVE?.connectionString ?? env?.DATABASE_URL ?? process.env.AGENT_DATABASE_URL;

  if (!connectionString) {
    throw new Error('No support-agent database connection string available');
  }

  return sanitizeConnectionString(connectionString);
}

export async function withSupportClient<T>(env: Partial<SupportAgentEnv>, fn: (client: pg.Client) => Promise<T>) {
  const client = new Client({ connectionString: getSupportDatabaseUrl(env) });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
