import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getBeansPage } from '@/db/queries';
import { CoffeeBeansGrid } from '@/components/coffee-beans-grid';
import { BeansGridSkeleton } from '@/components/beans-grid-skeleton';
import { LatencyRecorder } from '@/components/latency-recorder';
import { PageShell } from '@/components/page-shell';
import {
	getSearchParamValue,
	HYPERDRIVE_COOKIE,
	resolveHyperdrivePreference,
} from '@/lib/hyperdrive-mode';

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

	// URL-driven pagination: each page is bookmarkable via ?page=N and changing
	// it is a normal navigation that re-renders this server component.
	const page = parseInt(getSearchParamValue(resolvedSearchParams, 'page') ?? '1', 10);

	return (
		<PageShell useHyperdrive={useHyperdrive}>
			{/* Keyed on page so each navigation suspends and shows the skeleton
			    while the new page's data is fetched server-side. */}
			<Suspense key={page} fallback={<BeansGridSkeleton />}>
				<BeansCatalog page={page} useHyperdrive={useHyperdrive} />
			</Suspense>
		</PageShell>
	);
}

async function BeansCatalog({
	page,
	useHyperdrive,
}: {
	page: number;
	useHyperdrive: boolean;
}) {
	const { beans, pagination, dbDurationMs, totalMs, isUsingHyperdrive } =
		await getBeansPage({ page, useHyperdrive });

	return (
		<>
			<LatencyRecorder
				label={`page ${pagination.currentPage}`}
				dbDurationMs={dbDurationMs}
				totalMs={totalMs}
				isUsingHyperdrive={isUsingHyperdrive}
			/>
			<CoffeeBeansGrid
				beans={beans}
				pagination={pagination}
				useHyperdrive={useHyperdrive}
			/>
		</>
	);
}
