# The Coffee Cluster

A Next.js demo application showcasing **PlanetScale database latency** and **Cloudflare Workers** deployment, with plans to demonstrate **Hyperdrive** performance improvements.

## Overview

The Coffee Cluster is a coffee bean catalog application that displays a paginated grid of premium coffee beans. The project is designed to demonstrate:

1. **Database latency visualization** - Direct PlanetScale connection with visible request timing
2. **Server-side rendering** - Initial page loads are server-rendered for performance
3. **Client-side pagination** - Subsequent pages fetch via API with real-time latency feedback
4. **Modern UI/UX** - Skeleton loading states and toast notifications for request timing

## Tech Stack

### Core Framework
- **Next.js 15.5.6** (App Router)
- **React 19.1.0**
- **TypeScript**
- **Tailwind CSS 4**

### Database & ORM
- **PlanetScale** (MySQL-compatible serverless database)
- **Drizzle ORM 0.44.7** (Type-safe database toolkit)
- **pg 8.16.3** (PostgreSQL client, currently used for direct connection)

### Deployment
- **Cloudflare Workers** via OpenNext
- **@opennextjs/cloudflare 1.11.0** (Next.js adapter for Cloudflare)

### UI Components
- **Shadcn/ui** components:
  - Pagination
  - Skeleton (loading states)
  - Sonner (toast notifications)
  - Button
- **Lucide React** (icons)
- **next-themes** (theme support)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with ThemeProvider & Toaster
│   ├── page.tsx                # Homepage (server-rendered)
│   └── api/
│       └── beans/
│           └── route.ts        # Paginated API endpoint
├── components/
│   ├── coffee-bean-card.tsx           # Individual bean card
│   ├── coffee-bean-card-skeleton.tsx  # Loading skeleton
│   ├── coffee-beans-grid.tsx          # Grid with pagination (client)
│   ├── theme-provider.tsx             # Theme context wrapper
│   └── ui/                            # Shadcn components
│       ├── pagination.tsx
│       ├── skeleton.tsx
│       ├── sonner.tsx
│       └── button.tsx
├── db/
│   ├── schema.ts               # Drizzle schema (suppliers, coffeeBeans)
│   ├── index.ts                # Database connection utility
│   └── seed.ts                 # Seed script (72 coffee beans)
└── lib/
    └── utils.ts                # Utility functions (cn helper)
```

## Database Schema

### Tables

**suppliers**
- `id` - Serial primary key
- `name` - Supplier name
- `country` - Country of origin
- `isFairTrade` - Boolean flag
- `websiteUrl` - Optional website

**coffeeBeans**
- `id` - Serial primary key
- `name` - Bean name (e.g., "Golden Reserve")
- `description` - Product description
- `imageKey` - R2 image key (currently using placeholders)
- `tastingNotes` - Comma-separated flavor notes
- `priceInCents` - Price stored as integer (avoiding float errors)
- `roastLevel` - Enum: 'Light', 'Medium', 'Dark', 'Espresso'
- `supplierId` - Foreign key to suppliers

### Seed Data
- 5 suppliers from various countries
- 72 coffee beans with randomized:
  - Names (combinations like "Misty Valley", "Golden Reserve")
  - Tasting notes (Blueberry, Chocolate, Jasmine, etc.)
  - Prices ($12-$35)
  - Roast levels
  - Supplier assignments

## How It Works

### Initial Page Load (Server-Rendered)
1. User visits homepage
2. `src/app/page.tsx` runs server-side
3. Fetches first 6 beans directly from PlanetScale
4. Renders initial HTML with data
5. Client hydrates with interactive pagination

### Pagination Flow (Client-Side)
1. User clicks pagination button
2. `CoffeeBeansGrid` component:
   - Shows 6 skeleton cards immediately
   - Records start time with `performance.now()`
   - Fetches from `/api/beans?page=N`
3. API route queries database:
   - Uses `LIMIT` and `OFFSET` for pagination
   - Returns 6 beans + pagination metadata
4. Client receives response:
   - Calculates request duration
   - Updates grid with new beans
   - Shows toast: "Loaded page N" with timing

### Latency Measurement
Every pagination request displays:
- ✅ Success toast with millisecond timing
- Shows PlanetScale direct connection latency
- **Goal**: Later add Hyperdrive to show dramatic speed improvement

## Key Features

### 1. Performance Monitoring
- Real-time request timing displayed in toasts
- Demonstrates database latency globally
- Basis for comparing PlanetScale vs Hyperdrive

### 2. Modern Loading States
- Skeleton cards mimic actual content layout
- Smooth animations during transitions
- No jarring loading spinners

### 3. Responsive Design
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns (2 rows = 6 beans per page)

### 4. Type Safety
- Full TypeScript coverage
- Drizzle ORM provides type-safe queries
- Strict schema validation

## Configuration

### Environment Variables
```bash
DATABASE_URL=postgresql://...  # PlanetScale connection string
```

### Next.js Config
```typescript
// next.config.ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'placehold.co' }
  ]
}
```

### Wrangler Config
- Main worker: `.open-next/worker.js`
- Assets binding for static files
- Node.js compatibility enabled

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Seed database
npm run seed  # (if configured)

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy
```

## Future Improvements

### Planned: Hyperdrive Integration
The current setup uses direct PlanetScale connection to show baseline latency. Next steps:

1. **Add Hyperdrive binding** in `wrangler.jsonc`:
   ```json
   "hyperdrive": [
     {
       "binding": "HYPERDRIVE",
       "id": "your-hyperdrive-id"
     }
   ]
   ```

2. **Update database connection** in `src/db/index.ts`:
   - Check for Cloudflare Workers environment
   - Use Hyperdrive connection string if available
   - Fall back to direct connection in dev

3. **Compare latency**:
   - Toast timing will show dramatic improvement
   - Especially visible for users far from PlanetScale region

### Other Improvements
- **R2 Integration**: Replace placeholder images with actual R2 assets
- **Search/Filter**: Add filtering by roast level, price, supplier
- **Sorting**: Allow sorting by name, price, roast level
- **Bean Detail Pages**: Full product pages with supplier info
- **Shopping Cart**: Add e-commerce functionality
- **Analytics**: Track popular beans and user behavior

## Image Handling

Currently using **placeholder images** via placehold.co:
- Format: `https://placehold.co/400x300/8b7355/ffffff?text={beanName}`
- Coffee-colored background (#8b7355)

**Database contains R2 image keys** for future use:
- `beans/bag-minimal-light.jpg`
- `beans/pour-over-setup.jpg`
- `beans/espresso-crema.jpg`
- `beans/green-beans-sack.jpg`
- `beans/dark-roast-pile.jpg`
- `beans/latte-art-hero.jpg`

## Deployment Notes

### Cloudflare Workers
- Runs on edge locations globally
- Sub-50ms cold starts
- Automatic scaling
- Built-in caching via `@opennextjs/cloudflare`

### PlanetScale
- Serverless MySQL-compatible database
- Single region deployment (shows latency from edge)
- Automatic scaling and branching
- Connection pooling

### Why This Stack?
This project demonstrates the **latency challenge** of traditional database connections from edge workers, and how **Hyperdrive** solves it by:
- Connection pooling from Cloudflare's edge
- Query caching at the edge
- Smart routing to database regions

## License

Demo project - use freely for learning and experimentation.

---

**Built to showcase**: Modern serverless architecture, edge computing, and database optimization strategies with Cloudflare Workers.
