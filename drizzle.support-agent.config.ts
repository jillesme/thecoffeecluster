import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.AGENT_DATABASE_URL) {
  throw new Error('AGENT_DATABASE_URL is required for support-agent branch migrations');
}

if (process.env.AGENT_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('AGENT_DATABASE_URL must not equal DATABASE_URL');
}

const agentDatabaseUrl = new URL(process.env.AGENT_DATABASE_URL);

// PlanetScale Postgres connection strings may include sslrootcert=system, which
// libpq understands but node-postgres treats as a filesystem path. Node already
// uses the system trust store, so remove that parameter for Drizzle/pg locally.
if (agentDatabaseUrl.searchParams.get('sslrootcert') === 'system') {
  agentDatabaseUrl.searchParams.delete('sslrootcert');
}

export default defineConfig({
  out: './drizzle/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: agentDatabaseUrl.toString(),
  },
});
