import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Database connection that works both at build time and runtime
// - Build time: Uses DATABASE_URL environment variable
// - Runtime (Cloudflare Workers): Uses Hyperdrive for optimized edge connections (if enabled)
export function getDb(useHyperdrive = true) {
  let connectionString: string;
  let isUsingHyperdrive = false;

  if (useHyperdrive) {
    try {
      // Try to get Hyperdrive connection string (only available at runtime)
      const context = getCloudflareContext();
      connectionString = context.env.HYPERDRIVE.connectionString;
      isUsingHyperdrive = true;
    } catch {
      // Fall back to DATABASE_URL for build time or local development
      connectionString = process.env.DATABASE_URL!;
    }
  } else {
    // Use direct connection when Hyperdrive is disabled
    connectionString = process.env.DATABASE_URL!;
  }

  if (!connectionString) {
    throw new Error('No database connection string available. Set DATABASE_URL or configure Hyperdrive.');
  }

  return { db: drizzle(connectionString, { schema }), isUsingHyperdrive };
}
