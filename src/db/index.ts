import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from 'cloudflare:workers';
import * as schema from './schema';

type Drizzle = ReturnType<typeof drizzle<typeof schema>>;

// Reuse a Drizzle client per connection string so we don't rebuild the pool on
// every request. The two demo modes (direct vs Hyperdrive) use distinct
// connection strings, so each gets its own cached client.
const clientCache = new Map<string, Drizzle>();

function getClient(connectionString: string): Drizzle {
	let client = clientCache.get(connectionString);
	if (!client) {
		client = drizzle(connectionString, { schema });
		clientCache.set(connectionString, client);
	}
	return client;
}

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

	return { db: getClient(connectionString), isUsingHyperdrive };
}
