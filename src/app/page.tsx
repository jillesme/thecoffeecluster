import { getDb } from '@/db';
import { coffeeBeans } from '@/db/schema';
import { count } from 'drizzle-orm';
import { CoffeeBeansGrid } from '@/components/coffee-beans-grid';
import { PageShell } from '@/components/page-shell';
import { cookies } from 'next/headers';
import {
	HYPERDRIVE_COOKIE,
	resolveHyperdrivePreference,
} from '@/lib/hyperdrive-mode';

const BEANS_PER_PAGE = 6;

export default async function Home({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const [resolvedSearchParams, cookieStore] = await Promise.all([
		searchParams,
		cookies(),
	]);
	const useHyperdrive = resolveHyperdrivePreference({
		searchParams: resolvedSearchParams,
		cookieValue: cookieStore.get(HYPERDRIVE_COOKIE)?.value,
	});
	const { db } = await getDb(useHyperdrive);

	// Fetch initial page server-side
	const [[{ value: totalCount }], beans] = await Promise.all([
		db.select({ value: count() }).from(coffeeBeans),
		db.select().from(coffeeBeans).limit(BEANS_PER_PAGE).offset(0),
	]);

	const totalPages = Math.ceil(totalCount / BEANS_PER_PAGE);

	return (
		<PageShell useHyperdrive={useHyperdrive}>
			<CoffeeBeansGrid
				initialBeans={beans}
				useHyperdrive={useHyperdrive}
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
