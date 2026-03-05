interface CorrectionTrigger {
	slug: string;
	name: string;
	mbid: string;
}

export const correctionTriggerState = $state<{ active: CorrectionTrigger | null }>({
	active: null
});

/** Incremented after a correction is saved — artist cards watch this to re-read localStorage. */
export const correctionVersion = $state({ count: 0 });

export function triggerCorrection(artist: CorrectionTrigger): void {
	correctionTriggerState.active = artist;
}

export function clearCorrectionTrigger(): void {
	correctionTriggerState.active = null;
}

export function bumpCorrectionVersion(): void {
	correctionVersion.count++;
}
