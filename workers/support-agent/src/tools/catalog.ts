import { defineTool } from '@flue/runtime';
import { and, asc, desc, eq, gt, ilike, lte, ne, sql, type SQL } from 'drizzle-orm';
import * as v from 'valibot';
import {
  coffeeBeans,
  coffeeInventory,
  suppliers,
  type CoffeeBean,
  type CoffeeInventory,
  type RoastLevel,
  type Supplier,
} from '../../../../src/db/schema';
import type { SupportAgentEnv } from '../shared/env';
import { limitSchema, nonNegativeIntegerSchema, positiveIntegerSchema } from '../shared/schemas';
import { withSupportDb } from '../shared/support-db';

const roastLevelSchema = v.pipe(
  v.picklist(['Light', 'Medium', 'Dark', 'Espresso']),
  v.description('Coffee roast level: Light, Medium, Dark, or Espresso.'),
);

const tastingNoteSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1),
  v.maxLength(40),
  v.description('A tasting note such as blueberry, chocolate, jasmine, or citrus.'),
);

const beanResultSchema = v.object({
  beanId: positiveIntegerSchema,
  name: v.string(),
  description: v.nullable(v.string()),
  roastLevel: v.nullable(roastLevelSchema),
  tastingNotes: v.array(v.string()),
  priceInCents: nonNegativeIntegerSchema,
  supplierName: v.nullable(v.string()),
  supplierCountry: v.nullable(v.string()),
  isFairTrade: v.boolean(),
  availableQuantity: nonNegativeIntegerSchema,
  restockEta: v.nullable(v.string()),
});

const inventoryOutputSchema = v.object({
  beanId: positiveIntegerSchema,
  availableQuantity: nonNegativeIntegerSchema,
  inStock: v.boolean(),
  restockEta: v.nullable(v.string()),
});

const beanDetailsOutputSchema = v.union([
  v.object({ found: v.literal(false) }),
  v.object({
    found: v.literal(true),
    beanId: positiveIntegerSchema,
    name: v.string(),
    description: v.nullable(v.string()),
    roastLevel: v.nullable(roastLevelSchema),
    tastingNotes: v.array(v.string()),
    priceInCents: nonNegativeIntegerSchema,
    supplierName: v.nullable(v.string()),
    supplierCountry: v.nullable(v.string()),
    isFairTrade: v.boolean(),
    availableQuantity: nonNegativeIntegerSchema,
    restockEta: v.nullable(v.string()),
    imageKey: v.nullable(v.string()),
    inventory: inventoryOutputSchema,
  }),
]);

const beanIdInputSchema = v.object({
  beanId: v.pipe(positiveIntegerSchema, v.description('The coffee bean id from search results.')),
});

const beanSearchInputSchema = v.object({
  roastLevel: v.optional(roastLevelSchema),
  originCountry: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80))),
  tastingNotes: v.optional(v.pipe(v.array(tastingNoteSchema), v.maxLength(5))),
  maxPriceInCents: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100000))),
  fairTradeOnly: v.optional(v.boolean()),
  inStockOnly: v.optional(v.boolean()),
  limit: v.optional(limitSchema),
});

type BeanResult = v.InferOutput<typeof beanResultSchema>;
type BeanSearchInput = v.InferOutput<typeof beanSearchInputSchema> & { excludeBeanId?: CoffeeBean['id'] };
type BeanProjection = Pick<
  CoffeeBean,
  'name' | 'description' | 'imageKey' | 'roastLevel' | 'tastingNotes' | 'priceInCents'
> & {
  beanId: CoffeeBean['id'];
  supplierName: Supplier['name'] | null;
  supplierCountry: Supplier['country'] | null;
  isFairTrade: Supplier['isFairTrade'] | null;
  availableQuantity: number | string | null;
  restockEta: CoffeeInventory['restockEta'] | string | null;
};

const availableQuantity = sql<number>`greatest(coalesce(${coffeeInventory.quantityAvailable}, 0) - coalesce(${coffeeInventory.reservedQuantity}, 0), 0)`;

const beanProjection = {
  beanId: coffeeBeans.id,
  name: coffeeBeans.name,
  description: coffeeBeans.description,
  imageKey: coffeeBeans.imageKey,
  roastLevel: coffeeBeans.roastLevel,
  tastingNotes: coffeeBeans.tastingNotes,
  priceInCents: coffeeBeans.priceInCents,
  supplierName: suppliers.name,
  supplierCountry: suppliers.country,
  isFairTrade: suppliers.isFairTrade,
  availableQuantity,
  restockEta: coffeeInventory.restockEta,
};

function notesToArray(notes: string | null) {
  return notes
    ? notes
        .split(',')
        .map((note) => note.trim())
        .filter(Boolean)
    : [];
}

function toIso(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function clampLimit(limit: number | undefined, fallback = 5) {
  return Math.min(Math.max(Math.trunc(limit ?? fallback), 1), 10);
}

function mapBean(row: BeanProjection): BeanResult {
  return {
    beanId: row.beanId,
    name: row.name,
    description: row.description,
    roastLevel: row.roastLevel,
    tastingNotes: notesToArray(row.tastingNotes),
    priceInCents: row.priceInCents,
    supplierName: row.supplierName,
    supplierCountry: row.supplierCountry,
    isFairTrade: Boolean(row.isFairTrade),
    availableQuantity: Number(row.availableQuantity ?? 0),
    restockEta: toIso(row.restockEta),
  };
}

async function runBeanSearch(env: SupportAgentEnv, input: BeanSearchInput) {
  return withSupportDb(env, async (db) => {
    const where: SQL[] = [];

    if (input.roastLevel) where.push(eq(coffeeBeans.roastLevel, input.roastLevel));
    if (input.originCountry) where.push(ilike(suppliers.country, `%${input.originCountry}%`));
    if (input.maxPriceInCents != null) where.push(lte(coffeeBeans.priceInCents, input.maxPriceInCents));
    if (input.fairTradeOnly) where.push(eq(suppliers.isFairTrade, true));
    if (input.inStockOnly) where.push(gt(availableQuantity, 0));
    if (input.excludeBeanId) where.push(ne(coffeeBeans.id, input.excludeBeanId));

    for (const note of input.tastingNotes ?? []) {
      where.push(ilike(coffeeBeans.tastingNotes, `%${note}%`));
    }

    const rows = await db
      .select(beanProjection)
      .from(coffeeBeans)
      .leftJoin(suppliers, eq(suppliers.id, coffeeBeans.supplierId))
      .leftJoin(coffeeInventory, eq(coffeeInventory.coffeeBeanId, coffeeBeans.id))
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(desc(availableQuantity), asc(coffeeBeans.priceInCents))
      .limit(clampLimit(input.limit));

    return rows.map(mapBean);
  });
}

export function createCatalogTools(env: SupportAgentEnv) {
  const searchCoffeeBeans = defineTool({
    name: 'search_coffee_beans',
    description:
      'Search the coffee catalog with supplier and inventory data. Use this before answering product, origin, roast, price, fair-trade, or stock questions.',
    input: beanSearchInputSchema,
    output: v.object({ results: v.array(beanResultSchema) }),
    async run({ input, signal }) {
      signal?.throwIfAborted();
      return { results: await runBeanSearch(env, input) };
    },
  });

  const getBeanDetails = defineTool({
    name: 'get_bean_details',
    description: 'Get detailed catalog, supplier, and inventory information for one coffee bean by beanId.',
    input: beanIdInputSchema,
    output: beanDetailsOutputSchema,
    async run({ input, signal }) {
      signal?.throwIfAborted();
      return withSupportDb(env, async (db) => {
        const [row] = await db
          .select(beanProjection)
          .from(coffeeBeans)
          .leftJoin(suppliers, eq(suppliers.id, coffeeBeans.supplierId))
          .leftJoin(coffeeInventory, eq(coffeeInventory.coffeeBeanId, coffeeBeans.id))
          .where(eq(coffeeBeans.id, input.beanId))
          .limit(1);

        if (!row) return { found: false };
        const bean = mapBean(row);
        return {
          found: true,
          ...bean,
          imageKey: row.imageKey ?? null,
          inventory: {
            beanId: bean.beanId,
            availableQuantity: bean.availableQuantity,
            inStock: bean.availableQuantity > 0,
            restockEta: bean.restockEta,
          },
        };
      });
    },
  });

  const checkInventory = defineTool({
    name: 'check_inventory',
    description: 'Check the current stock level for one coffee bean by beanId.',
    input: beanIdInputSchema,
    output: inventoryOutputSchema,
    async run({ input, signal }) {
      signal?.throwIfAborted();
      return withSupportDb(env, async (db) => {
        const [row] = await db
          .select({ availableQuantity, restockEta: coffeeInventory.restockEta })
          .from(coffeeInventory)
          .where(eq(coffeeInventory.coffeeBeanId, input.beanId))
          .limit(1);

        const currentAvailability = Number(row?.availableQuantity ?? 0);
        return {
          beanId: input.beanId,
          availableQuantity: currentAvailability,
          inStock: currentAvailability > 0,
          restockEta: toIso(row?.restockEta ?? null),
        };
      });
    },
  });

  const findSimilarBeans = defineTool({
    name: 'find_similar_beans',
    description:
      'Find similar in-stock beans by roast level, tasting notes, and optional max price. Useful for alternatives or cheaper substitutes.',
    input: v.object({
      beanId: v.optional(v.pipe(positiveIntegerSchema, v.description('Bean id to use as the similarity seed.'))),
      roastLevel: v.optional(roastLevelSchema),
      tastingNotes: v.optional(v.pipe(v.array(tastingNoteSchema), v.maxLength(5))),
      maxPriceInCents: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100000))),
      inStockOnly: v.optional(v.boolean()),
      limit: v.optional(limitSchema),
    }),
    output: v.object({ results: v.array(beanResultSchema) }),
    async run({ input, signal }) {
      signal?.throwIfAborted();
      let roastLevel: RoastLevel | undefined = input.roastLevel;
      let tastingNotes = input.tastingNotes;
      let maxPriceInCents = input.maxPriceInCents;

      const beanId = input.beanId;

      if (beanId) {
        await withSupportDb(env, async (db) => {
          const [bean] = await db
            .select({
              roastLevel: coffeeBeans.roastLevel,
              tastingNotes: coffeeBeans.tastingNotes,
              priceInCents: coffeeBeans.priceInCents,
            })
            .from(coffeeBeans)
            .where(eq(coffeeBeans.id, beanId))
            .limit(1);

          roastLevel ??= bean?.roastLevel ?? undefined;
          tastingNotes ??= notesToArray(bean?.tastingNotes ?? null).slice(0, 2);
          maxPriceInCents ??= bean?.priceInCents;
        });
      }

      return {
        results: await runBeanSearch(env, {
          roastLevel,
          tastingNotes,
          maxPriceInCents,
          inStockOnly: input.inStockOnly ?? true,
          excludeBeanId: beanId,
          limit: input.limit ?? 5,
        }),
      };
    },
  });

  return [searchCoffeeBeans, getBeanDetails, checkInventory, findSimilarBeans];
}
