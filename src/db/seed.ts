import 'dotenv/config';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL!)

// 1. The 6 "R2" Image Keys we will cycle through
const IMAGE_KEYS = [
  'beans/bag-minimal-light.jpg',
  'beans/pour-over-setup.jpg',
  'beans/espresso-crema.jpg',
  'beans/green-beans-sack.jpg',
  'beans/dark-roast-pile.jpg',
  'beans/latte-art-hero.jpg',
];

// 2. Helper Arrays to generate "Fake" names
const ADJECTIVES = ['Misty', 'Golden', 'Velvet', 'Obsidian', 'Morning', 'Royal', 'Wild', 'Silent', 'Crimson', 'Deep'];
const NOUNS = ['Harvest', 'Reserve', 'Blend', 'Peak', 'Valley', 'Estate', 'Selection', 'Heirloom', 'Drift', 'Coast'];
const FLAVORS = ['Blueberry', 'Chocolate', 'Caramel', 'Jasmine', 'Hazelnut', 'Citrus', 'Honey', 'Vanilla', 'Smoke', 'Cherry'];

// 3. Helper function to pick random items
const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log('🌱 Starting Seed...');

  // --- STEP 1: CLEAN OLD DATA ---
  console.log('🧹 Clearing existing data...');
  // Delete beans first because they rely on suppliers (foreign key constraint)
  await db.delete(schema.coffeeBeans);
  await db.delete(schema.suppliers);

  // --- STEP 2: CREATE SUPPLIERS ---
  console.log('🏭 Creating Suppliers...');
  
  const suppliersData = [
    { name: 'Coastal Roasters', country: 'USA', isFairTrade: true, websiteUrl: 'https://example.com' },
    { name: 'Andes Origins', country: 'Colombia', isFairTrade: true, websiteUrl: 'https://example.com' },
    { name: 'Ethico Beans', country: 'Ethiopia', isFairTrade: true, websiteUrl: 'https://example.com' },
    { name: 'Pacific Rim Coffee', country: 'Indonesia', isFairTrade: false, websiteUrl: 'https://example.com' },
    { name: 'Nordic Roast', country: 'Sweden', isFairTrade: true, websiteUrl: 'https://example.com' },
  ];

  // Insert and get IDs back so we can link beans to them
  const insertedSuppliers = await db.insert(schema.suppliers)
    .values(suppliersData)
    .returning({ id: schema.suppliers.id });
  
  const supplierIds = insertedSuppliers.map(s => s.id);

  // --- STEP 3: GENERATE 72 BEANS ---
  console.log('☕ Brewing 72 varieties of beans...');
  
  const beansToInsert = [];

  for (let i = 0; i < 72; i++) {
    // Generate a unique-ish name
    const name = `${randomPick(ADJECTIVES)} ${randomPick(NOUNS)}`;
    
    // Pick 3 random tasting notes
    const notes = [randomPick(FLAVORS), randomPick(FLAVORS), randomPick(FLAVORS)].join(', ');
    
    // Cycle through the 6 images using Modulo operator
    const imageKey = IMAGE_KEYS[i % IMAGE_KEYS.length];

    beansToInsert.push({
      name: name,
      description: `A delightful ${randomPick(['full-bodied', 'bright', 'complex', 'smooth'])} coffee with hints of ${notes}.`,
      imageKey: imageKey,
      tastingNotes: notes,
      priceInCents: randomInt(1200, 3500), // Random price between $12.00 and $35.00
      roastLevel: randomPick(['Light', 'Medium', 'Dark', 'Espresso']) as 'Light' | 'Medium' | 'Dark' | 'Espresso',
      supplierId: randomPick(supplierIds), // Assign to random supplier
    });
  }

  // --- STEP 4: INSERT BEANS ---
  // We insert in one big batch for performance
  await db.insert(schema.coffeeBeans).values(beansToInsert);

  console.log('✅ Seeding Complete! Database is ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed');
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
