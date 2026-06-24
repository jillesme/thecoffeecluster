import 'dotenv/config';

import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import * as schema from '../src/db/schema';

type RoastLevel = 'Light' | 'Medium' | 'Dark' | 'Espresso';

const DEMO_BEANS: Array<{
  name: string;
  description: string;
  tastingNotes: string;
  priceInCents: number;
  roastLevel: RoastLevel;
  supplier: { name: string; country: string; isFairTrade: boolean; websiteUrl: string };
  imageKey: string;
  quantityAvailable: number;
  reservedQuantity: number;
  restockEta: Date | null;
}> = [
  {
    name: 'Yirgacheffe Dawn',
    description: 'A bright Ethiopian light roast with floral aromatics, gentle citrus, and a clean blueberry finish.',
    tastingNotes: 'Blueberry, Jasmine, Citrus',
    priceInCents: 1895,
    roastLevel: 'Light',
    supplier: { name: 'Ethico Beans', country: 'Ethiopia', isFairTrade: true, websiteUrl: 'https://example.com/ethico' },
    imageKey: 'beans/bag-minimal-light.jpg',
    quantityAvailable: 18,
    reservedQuantity: 2,
    restockEta: null,
  },
  {
    name: 'Sidamo Honey Bloom',
    description: 'A soft, tea-like Ethiopian light roast with honey sweetness and delicate stone-fruit acidity.',
    tastingNotes: 'Honey, Apricot, Jasmine',
    priceInCents: 2195,
    roastLevel: 'Light',
    supplier: { name: 'Ethico Beans', country: 'Ethiopia', isFairTrade: true, websiteUrl: 'https://example.com/ethico' },
    imageKey: 'beans/pour-over-setup.jpg',
    quantityAvailable: 7,
    reservedQuantity: 1,
    restockEta: null,
  },
  {
    name: 'Harrar Night Market',
    description: 'A fruit-forward Ethiopian medium roast with chocolate depth and a winey berry finish.',
    tastingNotes: 'Chocolate, Cherry, Blueberry',
    priceInCents: 1995,
    roastLevel: 'Medium',
    supplier: { name: 'Ethico Beans', country: 'Ethiopia', isFairTrade: true, websiteUrl: 'https://example.com/ethico' },
    imageKey: 'beans/dark-roast-pile.jpg',
    quantityAvailable: 0,
    reservedQuantity: 0,
    restockEta: daysFromNow(9),
  },
  {
    name: 'Andes Cocoa Velvet',
    description: 'A Colombian medium roast with a round cocoa body, caramel sweetness, and a smooth finish.',
    tastingNotes: 'Chocolate, Caramel, Hazelnut',
    priceInCents: 1695,
    roastLevel: 'Medium',
    supplier: { name: 'Andes Origins', country: 'Colombia', isFairTrade: true, websiteUrl: 'https://example.com/andes' },
    imageKey: 'beans/latte-art-hero.jpg',
    quantityAvailable: 21,
    reservedQuantity: 3,
    restockEta: null,
  },
  {
    name: 'Pacific Crema Engine',
    description: 'A syrupy espresso roast built for dense crema, dark chocolate, and a low-acid finish.',
    tastingNotes: 'Dark Chocolate, Smoke, Caramel',
    priceInCents: 1595,
    roastLevel: 'Espresso',
    supplier: { name: 'Pacific Rim Coffee', country: 'Indonesia', isFairTrade: false, websiteUrl: 'https://example.com/pacific' },
    imageKey: 'beans/espresso-crema.jpg',
    quantityAvailable: 14,
    reservedQuantity: 4,
    restockEta: null,
  },
  {
    name: 'Guji Orchard Spark',
    description: 'A lively Ethiopian light roast with citrus brightness, orchard fruit, and a clean floral finish.',
    tastingNotes: 'Citrus, Apricot, Jasmine',
    priceInCents: 1595,
    roastLevel: 'Light',
    supplier: { name: 'Ethico Beans', country: 'Ethiopia', isFairTrade: true, websiteUrl: 'https://example.com/ethico' },
    imageKey: 'beans/green-beans-sack.jpg',
    quantityAvailable: 11,
    reservedQuantity: 1,
    restockEta: null,
  },
  {
    name: 'Limu Cloudline',
    description: 'A graceful Ethiopian light roast with soft florals, lemon sweetness, and a tea-like body.',
    tastingNotes: 'Lemon, Jasmine, Honey',
    priceInCents: 2495,
    roastLevel: 'Light',
    supplier: { name: 'Ethico Beans', country: 'Ethiopia', isFairTrade: true, websiteUrl: 'https://example.com/ethico' },
    imageKey: 'beans/bag-minimal-light.jpg',
    quantityAvailable: 0,
    reservedQuantity: 0,
    restockEta: daysFromNow(5),
  },
  {
    name: 'Kenya Citrus Peak',
    description: 'A crisp light roast with grapefruit acidity, blackcurrant sweetness, and a sparkling finish.',
    tastingNotes: 'Grapefruit, Blackcurrant, Citrus',
    priceInCents: 2295,
    roastLevel: 'Light',
    supplier: { name: 'Highland Cooperative', country: 'Kenya', isFairTrade: true, websiteUrl: 'https://example.com/highland' },
    imageKey: 'beans/pour-over-setup.jpg',
    quantityAvailable: 9,
    reservedQuantity: 2,
    restockEta: null,
  },
  {
    name: 'Andes Morning Caramel',
    description: 'A balanced Colombian medium roast with caramel sweetness and a comforting nutty finish.',
    tastingNotes: 'Caramel, Almond, Chocolate',
    priceInCents: 1495,
    roastLevel: 'Medium',
    supplier: { name: 'Andes Origins', country: 'Colombia', isFairTrade: true, websiteUrl: 'https://example.com/andes' },
    imageKey: 'beans/latte-art-hero.jpg',
    quantityAvailable: 25,
    reservedQuantity: 5,
    restockEta: null,
  },
  {
    name: 'Colombia Golden Reserve',
    description: 'A sweet, approachable medium roast with honeyed body, milk chocolate, and gentle citrus.',
    tastingNotes: 'Honey, Milk Chocolate, Citrus',
    priceInCents: 1895,
    roastLevel: 'Medium',
    supplier: { name: 'Andes Origins', country: 'Colombia', isFairTrade: true, websiteUrl: 'https://example.com/andes' },
    imageKey: 'beans/bag-minimal-light.jpg',
    quantityAvailable: 0,
    reservedQuantity: 0,
    restockEta: daysFromNow(12),
  },
  {
    name: 'Sumatra Cedar Shade',
    description: 'A deep Indonesian dark roast with cedar, molasses, and low-acid chocolate depth.',
    tastingNotes: 'Cedar, Molasses, Dark Chocolate',
    priceInCents: 1795,
    roastLevel: 'Dark',
    supplier: { name: 'Pacific Rim Coffee', country: 'Indonesia', isFairTrade: false, websiteUrl: 'https://example.com/pacific' },
    imageKey: 'beans/dark-roast-pile.jpg',
    quantityAvailable: 16,
    reservedQuantity: 2,
    restockEta: null,
  },
  {
    name: 'Nordic Fireside Blend',
    description: 'A cozy dark roast blend with smoky aromatics, bittersweet chocolate, and a heavy body.',
    tastingNotes: 'Smoke, Bittersweet Chocolate, Toasted Almond',
    priceInCents: 1695,
    roastLevel: 'Dark',
    supplier: { name: 'Nordic Roast', country: 'Sweden', isFairTrade: true, websiteUrl: 'https://example.com/nordic' },
    imageKey: 'beans/dark-roast-pile.jpg',
    quantityAvailable: 8,
    reservedQuantity: 1,
    restockEta: null,
  },
  {
    name: 'Coastal Breakfast Drift',
    description: 'An easy-drinking medium roast with vanilla, toasted nut, and a mellow cocoa finish.',
    tastingNotes: 'Vanilla, Hazelnut, Cocoa',
    priceInCents: 1295,
    roastLevel: 'Medium',
    supplier: { name: 'Coastal Roasters', country: 'USA', isFairTrade: true, websiteUrl: 'https://example.com/coastal' },
    imageKey: 'beans/green-beans-sack.jpg',
    quantityAvailable: 30,
    reservedQuantity: 6,
    restockEta: null,
  },
  {
    name: 'Velvet Espresso House',
    description: 'A dependable espresso roast with crema-friendly body, cocoa, and brown sugar sweetness.',
    tastingNotes: 'Cocoa, Brown Sugar, Caramel',
    priceInCents: 1395,
    roastLevel: 'Espresso',
    supplier: { name: 'Coastal Roasters', country: 'USA', isFairTrade: true, websiteUrl: 'https://example.com/coastal' },
    imageKey: 'beans/espresso-crema.jpg',
    quantityAvailable: 22,
    reservedQuantity: 7,
    restockEta: null,
  },
  {
    name: 'Obsidian Espresso Reserve',
    description: 'A premium espresso roast with dense chocolate, cherry, and a polished syrupy texture.',
    tastingNotes: 'Chocolate, Cherry, Molasses',
    priceInCents: 2895,
    roastLevel: 'Espresso',
    supplier: { name: 'Nordic Roast', country: 'Sweden', isFairTrade: true, websiteUrl: 'https://example.com/nordic' },
    imageKey: 'beans/espresso-crema.jpg',
    quantityAvailable: 3,
    reservedQuantity: 1,
    restockEta: null,
  },
];

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(9, 0, 0, 0);
  return date;
}

function getAgentDatabaseUrl() {
  if (!process.env.AGENT_DATABASE_URL) {
    throw new Error('AGENT_DATABASE_URL is required');
  }

  if (process.env.AGENT_DATABASE_URL === process.env.DATABASE_URL) {
    throw new Error('Refusing to seed: AGENT_DATABASE_URL must not equal DATABASE_URL');
  }

  const url = new URL(process.env.AGENT_DATABASE_URL);
  if (url.searchParams.get('sslrootcert') === 'system') {
    url.searchParams.delete('sslrootcert');
  }
  return url.toString();
}

const db = drizzle(getAgentDatabaseUrl(), { schema });

async function findOrCreateSupplier(demoSupplier: (typeof DEMO_BEANS)[number]['supplier']) {
  const existing = await db.query.suppliers.findFirst({
    where: and(eq(schema.suppliers.name, demoSupplier.name), eq(schema.suppliers.country, demoSupplier.country)),
  });

  if (existing) return existing.id;

  const [inserted] = await db
    .insert(schema.suppliers)
    .values(demoSupplier)
    .returning({ id: schema.suppliers.id });

  return inserted.id;
}

async function findOrCreateDemoBeans() {
  const inventoryByName = new Map(DEMO_BEANS.map((bean) => [bean.name, bean]));

  for (const demoBean of DEMO_BEANS) {
    const supplierId = await findOrCreateSupplier(demoBean.supplier);
    const existing = await db.query.coffeeBeans.findFirst({
      where: eq(schema.coffeeBeans.name, demoBean.name),
    });

    if (existing) {
      await db
        .update(schema.coffeeBeans)
        .set({
          description: demoBean.description,
          imageKey: demoBean.imageKey,
          tastingNotes: demoBean.tastingNotes,
          priceInCents: demoBean.priceInCents,
          roastLevel: demoBean.roastLevel,
          supplierId,
        })
        .where(eq(schema.coffeeBeans.id, existing.id));
      continue;
    }

    await db.insert(schema.coffeeBeans).values({
      name: demoBean.name,
      description: demoBean.description,
      imageKey: demoBean.imageKey,
      tastingNotes: demoBean.tastingNotes,
      priceInCents: demoBean.priceInCents,
      roastLevel: demoBean.roastLevel,
      supplierId,
    });
  }

  return inventoryByName;
}

function deterministicStock(beanId: number, roastLevel: RoastLevel | null) {
  if (beanId % 11 === 0) {
    return { quantityAvailable: 0, reservedQuantity: 0, restockEta: daysFromNow((beanId % 7) + 3) };
  }

  const base = roastLevel === 'Espresso' ? 10 : roastLevel === 'Light' ? 8 : 6;
  const quantityAvailable = base + (beanId % 13);
  const reservedQuantity = beanId % 4;

  return { quantityAvailable, reservedQuantity, restockEta: null };
}

async function main() {
  console.log('🌱 Seeding support-agent inventory branch...');

  const demoInventoryByName = await findOrCreateDemoBeans();
  const beans = await db.query.coffeeBeans.findMany({
    with: { supplier: true },
    orderBy: (coffeeBeans, { asc }) => [asc(coffeeBeans.id)],
  });

  if (beans.length === 0) {
    throw new Error('No coffee beans found. Seed the catalog before inventory.');
  }

  const now = new Date();
  const inventoryRows = beans.map((bean) => {
    const demoInventory = demoInventoryByName.get(bean.name);
    const stock = demoInventory
      ? {
          quantityAvailable: demoInventory.quantityAvailable,
          reservedQuantity: demoInventory.reservedQuantity,
          restockEta: demoInventory.restockEta,
        }
      : deterministicStock(bean.id, bean.roastLevel);

    return {
      coffeeBeanId: bean.id,
      ...stock,
      updatedAt: now,
    };
  });

  await db
    .insert(schema.coffeeInventory)
    .values(inventoryRows)
    .onConflictDoUpdate({
      target: schema.coffeeInventory.coffeeBeanId,
      set: {
        quantityAvailable: sql`excluded.quantity_available`,
        reservedQuantity: sql`excluded.reserved_quantity`,
        restockEta: sql`excluded.restock_eta`,
        updatedAt: now,
      },
    });

  const ethiopianLight = beans.filter(
    (bean) => bean.supplier?.country === 'Ethiopia' && bean.roastLevel === 'Light',
  ).length;
  const outOfStock = inventoryRows.filter((row) => row.quantityAvailable - row.reservedQuantity <= 0).length;

  console.log(`✅ Inventory rows upserted: ${inventoryRows.length}`);
  console.log(`✅ Ethiopian light roasts available for demo: ${ethiopianLight}`);
  console.log(`✅ Out-of-stock examples: ${outOfStock}`);
}

main().catch((error) => {
  console.error('❌ Support-agent inventory seed failed');
  console.error(error);
  process.exit(1);
});
