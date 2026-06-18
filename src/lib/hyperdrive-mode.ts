export const HYPERDRIVE_COOKIE = 'use-hyperdrive';
export const HYPERDRIVE_QUERY_PARAM = 'hyperdrive';

type SearchParamsLike =
	| URLSearchParams
	| Record<string, string | string[] | undefined>
	| undefined;

function firstValue(value: string | string[] | null | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export function parseBooleanPreference(value: string | null | undefined) {
	if (value === 'true' || value === '1' || value === 'on') return true;
	if (value === 'false' || value === '0' || value === 'off') return false;
	return undefined;
}

export function getSearchParamValue(
	searchParams: SearchParamsLike,
	key = HYPERDRIVE_QUERY_PARAM
) {
	if (!searchParams) return undefined;

	if (searchParams instanceof URLSearchParams) {
		return searchParams.get(key) ?? undefined;
	}

	return firstValue(searchParams[key]);
}

export function resolveHyperdrivePreference({
	searchParams,
	cookieValue,
	defaultValue = false,
}: {
	searchParams?: SearchParamsLike;
	cookieValue?: string | null;
	defaultValue?: boolean;
}) {
	return (
		parseBooleanPreference(getSearchParamValue(searchParams)) ??
		parseBooleanPreference(cookieValue ?? undefined) ??
		defaultValue
	);
}

export function withHyperdriveParam(href: string, useHyperdrive: boolean) {
	const separator = href.includes('?') ? '&' : '?';
	return `${href}${separator}${HYPERDRIVE_QUERY_PARAM}=${useHyperdrive ? 'true' : 'false'}`;
}
