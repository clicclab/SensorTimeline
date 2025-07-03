<script lang="ts">
    import LabeledRecordingsList from "$lib/components/LabeledRecordingsList.svelte";
    import type { Recording } from "$lib/types";

    type Props = {
        recordings?: Recording[];
        onDeleteRecording?: (id: string) => void;
        onPlayRecording?: (recording: any) => void;
        savedSelections?: Array<{
            t0: number;
            t1: number;
            label: string;
        }>;
    };

    let { recordings = [], onDeleteRecording, onPlayRecording, savedSelections = $bindable([]) }: Props = $props();

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
            <!-- Optionally, you can show a count by passing a derived value from the child, or omit for now -->
        </div>
        <LabeledRecordingsList recordings={recordings} />
    {/if}
</div>
