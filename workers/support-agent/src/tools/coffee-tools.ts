import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { withSupportClient } from '../db';
import type { SupportAgentEnv } from '../env';

const roastLevelSchema = v.picklist(['Light', 'Medium', 'Dark', 'Espresso']);

const beanResultSchema = v.object({
  beanId: v.number(),
  name: v.string(),
  description: v.nullable(v.string()),
  roastLevel: v.nullable(v.string()),
  tastingNotes: v.array(v.string()),
  priceInCents: v.number(),
  supplierName: v.nullable(v.string()),
  supplierCountry: v.nullable(v.string()),
  isFairTrade: v.boolean(),
  availableQuantity: v.number(),
  restockEta: v.nullable(v.string()),
});

interface BeanSearchInput {
  roastLevel?: 'Light' | 'Medium' | 'Dark' | 'Espresso';
  originCountry?: string;
  tastingNotes?: string[];
  maxPriceInCents?: number;
  fairTradeOnly?: boolean;
  inStockOnly?: boolean;
  excludeBeanId?: number;
  limit?: number;
}

interface BeanRow {
  bean_id: number;
  name: string;
  description: string | null;
  roast_level: string | null;
  tasting_notes: string | null;
  price_in_cents: number;
  image_key?: string | null;
  supplier_name: string | null;
  supplier_country: string | null;
  is_fair_trade: boolean | null;
  available_quantity: number | string | null;
  restock_eta: Date | string | null;
}

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

function mapBeanRow(row: BeanRow) {
  return {
    beanId: Number(row.bean_id),
    name: row.name,
    description: row.description,
    roastLevel: row.roast_level,
    tastingNotes: notesToArray(row.tasting_notes),
    priceInCents: Number(row.price_in_cents),
    supplierName: row.supplier_name,
    supplierCountry: row.supplier_country,
    isFairTrade: Boolean(row.is_fair_trade),
    availableQuantity: Number(row.available_quantity ?? 0),
    restockEta: toIso(row.restock_eta),
  };
}

async function runBeanSearch(env: SupportAgentEnv, input: BeanSearchInput) {
  return withSupportClient(env, async (client) => {
    const params: unknown[] = [];
    const where: string[] = [];

    function addParam(value: unknown) {
      params.push(value);
      return `$${params.length}`;
    }

    if (input.roastLevel) where.push(`cb.roast_level = ${addParam(input.roastLevel)}`);
    if (input.originCountry) where.push(`s.country ILIKE ${addParam(input.originCountry)}`);
    if (input.maxPriceInCents) where.push(`cb.price_in_cents <= ${addParam(input.maxPriceInCents)}`);
    if (input.fairTradeOnly) where.push('s.is_fair_trade = true');
    if (input.inStockOnly) where.push('(coalesce(ci.quantity_available, 0) - coalesce(ci.reserved_quantity, 0)) > 0');
    if (input.excludeBeanId) where.push(`cb.id <> ${addParam(input.excludeBeanId)}`);

    for (const note of input.tastingNotes ?? []) {
      where.push(`cb.tasting_notes ILIKE ${addParam(`%${note}%`)}`);
    }

    const limit = Math.min(input.limit ?? 5, 10);
    const result = await client.query<BeanRow>(
      `
        select
          cb.id as bean_id,
          cb.name,
          cb.description,
          cb.roast_level,
          cb.tasting_notes,
          cb.price_in_cents,
          cb.image_key,
          s.name as supplier_name,
          s.country as supplier_country,
          s.is_fair_trade,
          coalesce(ci.quantity_available, 0) - coalesce(ci.reserved_quantity, 0) as available_quantity,
          ci.restock_eta
        from coffee_beans cb
        left join suppliers s on s.id = cb.supplier_id
        left join coffee_inventory ci on ci.coffee_bean_id = cb.id
        ${where.length ? `where ${where.join(' and ')}` : ''}
        order by available_quantity desc, cb.price_in_cents asc
        limit ${addParam(limit)}
      `,
      params,
    );

    return result.rows.map(mapBeanRow);
  });
}

export function createCoffeeTools(env: SupportAgentEnv) {
  const searchCoffeeBeans = defineTool({
    name: 'search_coffee_beans',
    description:
      'Search the coffee catalog with supplier and inventory data. Use this before answering product, origin, roast, price, fair-trade, or stock questions.',
    input: v.object({
      roastLevel: v.optional(roastLevelSchema),
      originCountry: v.optional(v.string()),
      tastingNotes: v.optional(v.array(v.string())),
      maxPriceInCents: v.optional(v.number()),
      fairTradeOnly: v.optional(v.boolean()),
      inStockOnly: v.optional(v.boolean()),
      limit: v.optional(v.number()),
    }),
    output: v.object({ results: v.array(beanResultSchema) }),
    async run({ input }) {
      return { results: await runBeanSearch(env, input) };
    },
  });

  const getBeanDetails = defineTool({
    name: 'get_bean_details',
    description: 'Get detailed catalog, supplier, and inventory information for one coffee bean by beanId.',
    input: v.object({ beanId: v.number() }),
    async run({ input }) {
      return withSupportClient(env, async (client) => {
        const result = await client.query<BeanRow>(
          `
            select
              cb.id as bean_id,
              cb.name,
              cb.description,
              cb.roast_level,
              cb.tasting_notes,
              cb.price_in_cents,
              cb.image_key,
              s.name as supplier_name,
              s.country as supplier_country,
              s.is_fair_trade,
              coalesce(ci.quantity_available, 0) - coalesce(ci.reserved_quantity, 0) as available_quantity,
              ci.restock_eta
            from coffee_beans cb
            left join suppliers s on s.id = cb.supplier_id
            left join coffee_inventory ci on ci.coffee_bean_id = cb.id
            where cb.id = $1
            limit 1
          `,
          [input.beanId],
        );

        const row = result.rows[0];
        if (!row) return { found: false };
        const bean = mapBeanRow(row);
        return {
          found: true,
          ...bean,
          imageKey: row.image_key ?? null,
          inventory: {
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
    input: v.object({ beanId: v.number() }),
    async run({ input }) {
      return withSupportClient(env, async (client) => {
        const result = await client.query<{
          available_quantity: number | string | null;
          restock_eta: Date | string | null;
        }>(
          `
            select
              coalesce(quantity_available, 0) - coalesce(reserved_quantity, 0) as available_quantity,
              restock_eta
            from coffee_inventory
            where coffee_bean_id = $1
            limit 1
          `,
          [input.beanId],
        );

        const row = result.rows[0];
        const availableQuantity = Number(row?.available_quantity ?? 0);
        return {
          beanId: input.beanId,
          availableQuantity,
          inStock: availableQuantity > 0,
          restockEta: toIso(row?.restock_eta ?? null),
        };
      });
    },
  });

  const findSimilarBeans = defineTool({
    name: 'find_similar_beans',
    description:
      'Find similar in-stock beans by roast level, tasting notes, and optional max price. Useful for alternatives or cheaper substitutes.',
    input: v.object({
      beanId: v.optional(v.number()),
      roastLevel: v.optional(roastLevelSchema),
      tastingNotes: v.optional(v.array(v.string())),
      maxPriceInCents: v.optional(v.number()),
      inStockOnly: v.optional(v.boolean()),
      limit: v.optional(v.number()),
    }),
    output: v.object({ results: v.array(beanResultSchema) }),
    async run({ input }) {
      let roastLevel = input.roastLevel;
      let tastingNotes = input.tastingNotes;
      let maxPriceInCents = input.maxPriceInCents;

      if (input.beanId) {
        await withSupportClient(env, async (client) => {
          const result = await client.query<{
            roast_level: 'Light' | 'Medium' | 'Dark' | 'Espresso' | null;
            tasting_notes: string | null;
            price_in_cents: number;
          }>('select roast_level, tasting_notes, price_in_cents from coffee_beans where id = $1 limit 1', [input.beanId]);
          const bean = result.rows[0];
          roastLevel ??= bean?.roast_level ?? undefined;
          tastingNotes ??= notesToArray(bean?.tasting_notes ?? null).slice(0, 2);
          maxPriceInCents ??= bean?.price_in_cents;
        });
      }

      return {
        results: await runBeanSearch(env, {
          roastLevel,
          tastingNotes,
          maxPriceInCents,
          inStockOnly: input.inStockOnly ?? true,
          excludeBeanId: input.beanId,
          limit: input.limit ?? 5,
        }),
      };
    },
  });

  return [searchCoffeeBeans, getBeanDetails, checkInventory, findSimilarBeans];
}
