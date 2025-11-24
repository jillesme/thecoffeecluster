import { pgTable, serial, text, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Define an Enum for Roast Levels
// This restricts the column to specific values, preventing bad data.
export const roastEnum = pgEnum('roast_level', ['Light', 'Medium', 'Dark', 'Espresso']);

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
}));
