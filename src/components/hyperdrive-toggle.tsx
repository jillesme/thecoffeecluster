'use client';

import { Rocket } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useSyncExternalStore } from 'react';
import Cookies from 'js-cookie';

const hyperdriveToggleListeners = new Set<() => void>();

function subscribeToHyperdriveToggle(listener: () => void) {
	hyperdriveToggleListeners.add(listener);
	return () => hyperdriveToggleListeners.delete(listener);
}

function getHyperdriveToggleSnapshot() {
	return Cookies.get('use-hyperdrive') === 'true';
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
		Cookies.set('use-hyperdrive', pressed ? 'true' : 'false', { expires: 365 });
		notifyHyperdriveToggleListeners();
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
