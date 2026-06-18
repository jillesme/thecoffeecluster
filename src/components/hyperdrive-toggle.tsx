'use client';

import { Rocket } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useSyncExternalStore } from 'react';
import Cookies from 'js-cookie';
import {
	HYPERDRIVE_COOKIE,
	HYPERDRIVE_QUERY_PARAM,
	parseBooleanPreference,
} from '@/lib/hyperdrive-mode';

const hyperdriveToggleListeners = new Set<() => void>();

function subscribeToHyperdriveToggle(listener: () => void) {
	hyperdriveToggleListeners.add(listener);
	return () => hyperdriveToggleListeners.delete(listener);
}

function getHyperdriveToggleSnapshot() {
	const queryPreference =
		typeof window === 'undefined'
			? undefined
			: parseBooleanPreference(
					new URLSearchParams(window.location.search).get(HYPERDRIVE_QUERY_PARAM)
				);

	return queryPreference ?? (Cookies.get(HYPERDRIVE_COOKIE) === 'true');
}

function getServerHyperdriveToggleSnapshot() {
	return false;
}

function notifyHyperdriveToggleListeners() {
	for (const listener of hyperdriveToggleListeners) {
		listener();
	}
}

export function HyperdriveToggle() {
	const isEnabled = useSyncExternalStore(
		subscribeToHyperdriveToggle,
		getHyperdriveToggleSnapshot,
		getServerHyperdriveToggleSnapshot
	);

	const handleToggle = (pressed: boolean) => {
		Cookies.set(HYPERDRIVE_COOKIE, pressed ? 'true' : 'false', { expires: 365 });
		notifyHyperdriveToggleListeners();

		const url = new URL(window.location.href);
		url.searchParams.set(HYPERDRIVE_QUERY_PARAM, pressed ? 'true' : 'false');
		window.location.assign(url.toString());
	};

	return (
		<div className="fixed top-4 right-4 z-50">
			<Toggle
				aria-label="Toggle Hyperdrive"
				pressed={isEnabled}
				onPressedChange={handleToggle}
				size="default"
				variant="outline"
				className="dark:!bg-white dark:!text-black dark:!border-gray-300 dark:hover:!bg-gray-100 data-[state=on]:*:[svg]:fill-red-500 data-[state=on]:*:[svg]:stroke-red-500 shadow-sm"
			>
				<Rocket />
				Hyperdrive
				<span className="text-muted-foreground">
					({isEnabled ? 'on' : 'off'})
				</span>
			</Toggle>
		</div>
	);
}
