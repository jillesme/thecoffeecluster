import { getDb } from '@/db';
import { coffeeBeans } from '@/db/schema';
import { count } from 'drizzle-orm';
import { CoffeeBeansGrid } from '@/components/coffee-beans-grid';
import { LatencyStatsPanel } from '@/components/latency-stats-panel';
import { cookies } from 'next/headers';

const BEANS_PER_PAGE = 6;

export default async function Home() {
	const cookieStore = await cookies();
	const useHyperdrive = cookieStore.get('use-hyperdrive')?.value === 'true';
	const { db } = getDb(useHyperdrive);

	// Fetch initial page server-side
	const [{ value: totalCount }] = await db
		.select({ value: count() })
		.from(coffeeBeans);

	const beans = await db
		.select()
		.from(coffeeBeans)
		.limit(BEANS_PER_PAGE)
		.offset(0);

	const totalPages = Math.ceil(totalCount / BEANS_PER_PAGE);

	return (
		<div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
			<div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
				{/* Header */}
				<header className="mb-8 text-center">
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mb-4 tracking-tight">
						The Coffee Cluster
					</h1>
					<p className="text-lg text-stone-600 max-w-2xl mx-auto">
						Discover our curated collection of premium coffee beans from around the world
					</p>
				</header>

				{/* Latency Stats Panel */}
				<div className="mb-8 max-w-3xl mx-auto">
					<LatencyStatsPanel />
				</div>

				{/* Coffee Beans Grid with Pagination */}
				<main>
					<CoffeeBeansGrid
						initialBeans={beans}
						initialPagination={{
							currentPage: 1,
							totalPages,
							totalCount,
							perPage: BEANS_PER_PAGE,
						}}
					/>
				</main>
			</div>
		</div>
	);
}
