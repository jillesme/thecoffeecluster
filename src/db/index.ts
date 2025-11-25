import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Database connection that works both at build time and runtime
// - Build time: Uses DATABASE_URL environment variable
// - Runtime (Cloudflare Workers): Uses Hyperdrive for optimized edge connections
export function getDb() {
  let connectionString: string;

  try {
    // Try to get Hyperdrive connection string (only available at runtime)
    const context = getCloudflareContext();
    connectionString = context.env.HYPERDRIVE.connectionString;
  } catch {
    // Fall back to DATABASE_URL for build time or local development
    connectionString = process.env.DATABASE_URL!;
  }

  if (!connectionString) {
    throw new Error('No database connection string available. Set DATABASE_URL or configure Hyperdrive.');
  }

  return drizzle(connectionString, { schema });
}
