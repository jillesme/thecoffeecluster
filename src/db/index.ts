import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Simple PlanetScale connection using pg
// We'll add Hyperdrive later to show the performance difference
export function getDb() {
  const connectionString = getCloudflareContext().env.HYPERDRIVE.connectionString;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  return drizzle(connectionString, { schema });
}
