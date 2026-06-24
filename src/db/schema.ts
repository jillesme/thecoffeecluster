import { pgTable, serial, text, integer, boolean, pgEnum, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Define an Enum for Roast Levels
// This restricts the column to specific values, preventing bad data.
export const roastEnum = pgEnum('roast_level', ['Light', 'Medium', 'Dark', 'Espresso']);
export type RoastLevel = (typeof roastEnum.enumValues)[number];

// 2. Create the Suppliers Table (The "Parent")
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  country: text('country').notNull(), // e.g., "Ethiopia", "Colombia"
  isFairTrade: boolean('is_fair_trade').default(false),
  websiteUrl: text('website_url'),
});

// 3. Create the Coffee Beans Table (The "Child")
export const coffeeBeans = pgTable('coffee_beans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // e.g., "Misty Valley Reserve"
  description: text('description'),
  imageKey: text('image_key'),
  tastingNotes: text('tasting_notes'), // e.g., "Blueberry, Jasmine, Honey"
  
  // Best practice: Store currency as integers (cents) to avoid floating point math errors
  priceInCents: integer('price_in_cents').notNull(), 
  
  // Using the Enum we defined above
  roastLevel: roastEnum('roast_level').default('Medium'), 
  
  // The Foreign Key connecting to Suppliers
  supplierId: integer('supplier_id').references(() => suppliers.id),
});

// 4. Inventory rows for the support agent demo.
// Stock is intentionally modeled separately from the catalog so adding the agent
// remains an additive, no-downtime database change.
export const coffeeInventory = pgTable('coffee_inventory', {
  id: serial('id').primaryKey(),
  coffeeBeanId: integer('coffee_bean_id').notNull().references(() => coffeeBeans.id),
  quantityAvailable: integer('quantity_available').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  restockEta: timestamp('restock_eta', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('coffee_inventory_coffee_bean_id_unique').on(table.coffeeBeanId),
]);

// 5. Minimal wholesale lead capture for the support agent.
export const wholesaleLeads = pgTable('wholesale_leads', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  companyName: text('company_name'),
  location: text('location'),
  estimatedVolume: text('estimated_volume'),
  originalMessage: text('original_message').notNull(),
  agentSummary: text('agent_summary'),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 4. Define Application Relations (for the Drizzle Query Builder)
// This tells Drizzle how these two tables relate in your TypeScript code.

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  coffeeBeans: many(coffeeBeans), // A supplier has many beans
}));

export const coffeeBeansRelations = relations(coffeeBeans, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [coffeeBeans.supplierId],
    references: [suppliers.id],
  }), // A specific bean belongs to one supplier
  inventory: one(coffeeInventory, {
    fields: [coffeeBeans.id],
    references: [coffeeInventory.coffeeBeanId],
  }),
}));

export const coffeeInventoryRelations = relations(coffeeInventory, ({ one }) => ({
  coffeeBean: one(coffeeBeans, {
    fields: [coffeeInventory.coffeeBeanId],
    references: [coffeeBeans.id],
  }),
}));

export type Supplier = typeof suppliers.$inferSelect;
export type CoffeeBean = typeof coffeeBeans.$inferSelect;
export type CoffeeInventory = typeof coffeeInventory.$inferSelect;
export type WholesaleLead = typeof wholesaleLeads.$inferSelect;
export type NewWholesaleLead = typeof wholesaleLeads.$inferInsert;
