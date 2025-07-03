<script lang="ts">
    import { LocalStore } from "$lib/localStore";
    import { formatDuration } from "$lib/formatUtils";
    import type { LabeledRecording, Recording } from "$lib/types";
    import Sparkline from "./ui/Sparkline.svelte";

type Props = {
	recordings: Recording[];
    labeledRecordings?: LabeledRecording[];
};

let { recordings, labeledRecordings = $bindable([]) }: Props = $props();

async function loadLabeledRecordings() {
	const all: LabeledRecording[] = [];
	for (const recording of recordings) {
		const stored = await LocalStore.get<Array<{ t0: number; t1: number; label: string }>>(
			`saved-selections-${recording.startTime}`,
			[]
		);
		all.push(
			...(stored?.map((r: { t0: number; t1: number; label: string }) => ({
				recordingStartTime: recording.startTime,
				t0: r.t0,
				t1: r.t1,
				label: r.label
			})) || [])
		);
	}
	return all;
}

$effect(async () => {
	recordings;
	labeledRecordings = await loadLabeledRecordings();
});

const labeledRecordingsByClass = $derived(
	labeledRecordings.reduce((acc, rec) => {
		if (!acc[rec.label]) acc[rec.label] = [];
		acc[rec.label].push(rec);
		return acc;
	}, {} as Record<string, LabeledRecording[]>)
);

function getLabeledSensorData(labeled: LabeledRecording, recordings: Recording[]) {
	const parent = recordings.find(r => r.startTime === labeled.recordingStartTime);
	if (!parent) return [];
	const t0Abs = labeled.t0 < 1e12 ? labeled.recordingStartTime + labeled.t0 : labeled.t0;
	const t1Abs = labeled.t1 < 1e12 ? labeled.recordingStartTime + labeled.t1 : labeled.t1;
	return parent.sensorData.filter(d => d.timestamp >= t0Abs && d.timestamp <= t1Abs);
}
</script>

{#if Object.keys(labeledRecordingsByClass).length === 0}
	<div class="text-center py-8 text-gray-500">
		<div class="text-4xl mb-2">🏷️</div>
		<p class="text-sm">No labeled recordings yet</p>
		<p class="text-xs mt-1">Label recordings to create training data for your model</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each Object.entries(labeledRecordingsByClass) as [label, recordingsByLabel]}
			<div class="font-medium text-gray-900 mb-2">{label} ({recordingsByLabel.length})</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{#each recordingsByLabel as recording}
					<div class="border border-gray-200 rounded-lg p-3">
						<div class="flex items-center justify-between mb-2">
							<div class="flex items-center space-x-3">
								<div class="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs">
									🏷️
								</div>
								<div>
									<div class="font-medium text-sm">
										{new Date(recording.recordingStartTime).toLocaleString()}
									</div>
									<div class="text-xs text-gray-500 flex items-center gap-2">
										{formatDuration(recording.t1 - recording.t0)}
										<span class="inline-block">
											<Sparkline data={getLabeledSensorData(recording, recordings)} width={60} height={16} strokeWidth={2} />
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/each}
	</div>
{/if}
