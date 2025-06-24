<script lang="ts">
    import { LocalStore } from "$lib/localStore";
    import Sparkline from "$lib/components/ui/Sparkline.svelte";

    type Props = {
        recordings?: Array<{
            id: string;
            startTime: number;
            endTime: number;
            videoBlob: Blob;
            sensorData: Array<{x: number, y: number, z: number, timestamp: number}>;
            duration: number;
        }>;
        onDeleteRecording?: (id: string) => void;
        onPlayRecording?: (recording: any) => void;
        savedSelections?: Array<{
            t0: number;
            t1: number;
            label: string;
        }>;
    };

    let { recordings = [], onDeleteRecording, onPlayRecording, savedSelections = $bindable([]) }: Props = $props();

    let labeledRecordings: Array<{
        recordingStartTime: number;
        t0: number;
        t1: number;
        label: string;
    }> = $state([]);

    $effect(() => {
        recordings;
        loadLabeledRecordings().then(result => {
            labeledRecordings = result;
        });
    });

    $effect(() => {
        savedSelections;
        console.log('Saved selections updated:', savedSelections);
        loadLabeledRecordings().then(result => {
            labeledRecordings = result;
        });
    });

    let labeledRecordingsByClass: Record<string, Array<{
        recordingStartTime: number;
        t0: number;
        t1: number;
        label: string;
    }>> = $derived(labeledRecordings.reduce((acc, rec) => {
        if (!acc[rec.label]) {
            acc[rec.label] = [];
        }
        acc[rec.label].push(rec);
        return acc;
    }, {} as Record<string, Array<{
        recordingStartTime: number;
        t0: number;
        t1: number;
        label: string;
    }>>));

    async function loadLabeledRecordings() {
        let labeledRecordings = [];
        for (const recording of recordings) {
            const storedRecordings = await LocalStore.get<Array<{
                t0: number;
                t1: number;
                label: string;
            }>>(`saved-selections-${recording.startTime}`, []);

            labeledRecordings.push(...(storedRecordings?.map(r => ({
                recordingStartTime: recording.startTime,
                t0: r.t0,
                t1: r.t1,
                label: r.label
            })) || []));
        }

        console.log(`Loaded ${labeledRecordings.length} labeled recording(s)`, labeledRecordings);

        return labeledRecordings;
    }

    function formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function formatFileSize(bytes: number): string {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    }

    function downloadVideo(recording: any) {
        const url = URL.createObjectURL(recording.videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sensor-recording-${new Date(recording.startTime).toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function downloadSensorData(recording: any) {
        const csvContent = [
            'timestamp,x,y,z,magnitude',
            ...recording.sensorData.map((d: any) => 
                `${d.timestamp},${d.x},${d.y},${d.z},${Math.sqrt(d.x**2 + d.y**2 + d.z**2)}`
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sensor-data-${new Date(recording.startTime).toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function getLabeledSensorMagnitudes(labeled: { recordingStartTime: number; t0: number; t1: number; label: string }): number[] {
        // Find the parent recording
        const parent = recordings.find(r => r.startTime === labeled.recordingStartTime);
        if (!parent) return [];
        // Filter sensor data within t0-t1
        const segment = parent.sensorData.filter(d => d.timestamp >= labeled.t0 && d.timestamp <= labeled.t1);
        // Return magnitudes
        return segment.map(d => Math.sqrt(d.x ** 2 + d.y ** 2 + d.z ** 2));
    }

    function getLabeledSensorData(labeled: { recordingStartTime: number; t0: number; t1: number; label: string }) {
        const parent = recordings.find(r => r.startTime === labeled.recordingStartTime);
        if (!parent) return [];
        // If t0/t1 are relative, add recordingStartTime
        const t0Abs = labeled.t0 < 1e12 ? labeled.recordingStartTime + labeled.t0 : labeled.t0;
        const t1Abs = labeled.t1 < 1e12 ? labeled.recordingStartTime + labeled.t1 : labeled.t1;
        return parent.sensorData.filter(d => d.timestamp >= t0Abs && d.timestamp <= t1Abs);
    }
</script>

<div class="bg-white rounded-lg p-4 shadow-sm">
    <div class="flex items-center justify-between mb-4">
        <h3 class="font-medium text-gray-900">Recorded Sessions</h3>
        <span class="text-sm text-gray-500">{recordings.length} recordings</span>
    </div>

    {#if recordings.length === 0}
        <div class="text-center py-8 text-gray-500">
            <div class="text-4xl mb-2">🎬</div>
            <p class="text-sm">No recordings yet</p>
            <p class="text-xs mt-1">Start recording to capture synchronized video and sensor data</p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each recordings as recording}
                <div class="border border-gray-200 rounded-lg p-3">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs">
                                📹
                            </div>
                            <div>
                                <div class="font-medium text-sm">
                                    {new Date(recording.startTime).toLocaleString()}
                                </div>
                                <div class="text-xs text-gray-500">
                                    {formatDuration(recording.duration)} • 
                                    {recording.sensorData.length} sensor readings • 
                                    {formatFileSize(recording.videoBlob.size)}
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-1">
                            <button 
                                onclick={() => onPlayRecording?.(recording)}
                                class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                title="Play with synchronized sensor data"
                            >
                                ▶️
                            </button>
                            <button 
                                onclick={() => downloadVideo(recording)}
                                class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                title="Download video"
                            >
                                📥
                            </button>
                            <button 
                                onclick={() => downloadSensorData(recording)}
                                class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                title="Download sensor data CSV"
                            >
                                📊
                            </button>
                            <button 
                                onclick={() => onDeleteRecording?.(recording.id)}
                                class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                title="Delete recording"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                    
                    <!-- Quick stats -->
                    <div class="grid grid-cols-3 gap-2 text-xs text-gray-600">
                        <div>
                            <span class="text-gray-400">Start:</span> 
                            {new Date(recording.startTime).toLocaleTimeString()}
                        </div>
                        <div>
                            <span class="text-gray-400">End:</span> 
                            {new Date(recording.endTime).toLocaleTimeString()}
                        </div>
                        <div>
                            <span class="text-gray-400">Data points:</span> 
                            {recording.sensorData.length}
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <div class="flex items-center justify-between mb-4 mt-4">
            <h3 class="font-medium text-gray-900">Labeled Recordings</h3>
            <span class="text-sm text-gray-500">{labeledRecordings.length} labeled recordings</span>
        </div>

        {#if labeledRecordings.length === 0}
            <div class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">🏷️</div>
                <p class="text-sm">No labeled recordings yet</p>
                <p class="text-xs mt-1">Label recordings to create training data for your model</p>
            </div>
        {:else}
            <div class="space-y-3">
                {#each Object.entries(labeledRecordingsByClass) as [label, recordings]}
                    <div class="font-medium text-gray-900 mb-2">{label} ({recordings.length})</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {#each recordings as recording}
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
                                                    <Sparkline data={getLabeledSensorData(recording)} width={60} height={16} strokeWidth={2} />
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
    {/if}
</div>
