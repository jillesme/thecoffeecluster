import { getDb } from '@/db';
import { coffeeBeans } from '@/db/schema';
import { count } from 'drizzle-orm';
import { CoffeeBeansGrid } from '@/components/coffee-beans-grid';
import { PageShell } from '@/components/page-shell';
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
		<PageShell>
			<CoffeeBeansGrid
				initialBeans={beans}
				initialPagination={{
					currentPage: 1,
					totalPages,
					totalCount,
					perPage: BEANS_PER_PAGE,
				}}
			/>
		</PageShell>
	);
}
