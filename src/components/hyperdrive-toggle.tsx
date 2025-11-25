'use client';

import { Rocket } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

export function HyperdriveToggle() {
	const [isEnabled, setIsEnabled] = useState(false);

	// Read cookie on mount
	useEffect(() => {
		const cookieValue = Cookies.get('use-hyperdrive');
		setIsEnabled(cookieValue === 'true');
	}, []);

	const handleToggle = (pressed: boolean) => {
		setIsEnabled(pressed);
		Cookies.set('use-hyperdrive', pressed ? 'true' : 'false', { expires: 365 });
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
