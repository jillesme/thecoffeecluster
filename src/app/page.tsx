import { getBeansPage } from '@/db/queries';
import { CoffeeBeansGrid } from '@/components/coffee-beans-grid';
import { PageShell } from '@/components/page-shell';
import { cookies } from 'next/headers';
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

	// URL-driven pagination: the initial page is bookmarkable via ?page=N.
	const page = parseInt(getSearchParamValue(resolvedSearchParams, 'page') ?? '1', 10);

	const { beans, pagination } = await getBeansPage({ page, useHyperdrive });

	return (
		<PageShell useHyperdrive={useHyperdrive}>
			<CoffeeBeansGrid
				initialBeans={beans}
				useHyperdrive={useHyperdrive}
				initialPagination={pagination}
			/>
		</PageShell>
	);
}
