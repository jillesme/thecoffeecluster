import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from 'cloudflare:workers';
import * as schema from './schema';

// Database connection that works both at build time and runtime
// - Build time: Uses DATABASE_URL environment variable
// - Runtime (Cloudflare Workers): Uses Hyperdrive for optimized edge connections (if enabled)
export async function getDb(useHyperdrive = true) {
	let connectionString: string | undefined;
	let isUsingHyperdrive = false;

	if (useHyperdrive) {
		connectionString = env.HYPERDRIVE?.connectionString;
		isUsingHyperdrive = Boolean(connectionString);
	} else {
		// Use direct connection when Hyperdrive is disabled
		connectionString = process.env.DATABASE_URL!;
	}

	// Fall back to DATABASE_URL for local development or builds without Hyperdrive.
	connectionString ??= process.env.DATABASE_URL;

	if (!connectionString) {
		throw new Error('No database connection string available. Set DATABASE_URL or configure Hyperdrive.');
	}

	return { db: drizzle(connectionString, { schema }), isUsingHyperdrive };
}
