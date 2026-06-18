'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useLatencyStore } from '@/lib/latency-store';

interface BeanDetailLatencyRecorderProps {
	beanName: string;
	dbDurationMs: number;
	totalMs: number;
	isUsingHyperdrive: boolean;
}

export function BeanDetailLatencyRecorder({
	beanName,
	dbDurationMs,
	totalMs,
	isUsingHyperdrive,
}: BeanDetailLatencyRecorderProps) {
	const addRecord = useLatencyStore((state) => state.addRecord);

	useEffect(() => {
		addRecord({
			totalMs,
			dbMs: dbDurationMs,
			isHyperdrive: isUsingHyperdrive,
		});

		const connectionType = isUsingHyperdrive ? 'Hyperdrive' : 'Direct';
		toast.success(`Loaded ${beanName}`, {
			description: `${dbDurationMs}ms db / ${totalMs}ms server (${connectionType})`,
		});
	}, [addRecord, beanName, dbDurationMs, isUsingHyperdrive, totalMs]);

	return null;
}
