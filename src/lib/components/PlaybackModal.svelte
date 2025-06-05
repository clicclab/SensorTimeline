<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import AccelerometerChart from './AccelerometerChart.svelte';
    import MagnitudeChart from './MagnitudeChart.svelte';

    export let recording: {
        id: string;
        startTime: number;
        endTime: number;
        videoBlob: Blob;
        sensorData: Array<{x: number, y: number, z: number, timestamp: number}>;
        duration: number;
    } | null = null;
    
    export let onClose: (() => void) | undefined = undefined;

    let videoElement: HTMLVideoElement;
    let isPlaying = false;
    let currentTime = 0;
    let videoUrl = '';
    let playbackInterval: ReturnType<typeof setInterval> | null = null;
    
    // Full sensor data and current position
    let currentSensorData: Array<{x: number, y: number, z: number, timestamp: number}> = [];
    let currentReading: {x: number, y: number, z: number, timestamp: number} | null = null;
    let currentTimelinePosition = 0; // Position in the timeline (0-1)

    // Sync sensor data with video playback
    function updateSensorData() {
        if (!recording || !videoElement) return;

        const videoCurrentTime = videoElement.currentTime * 1000; // Convert to ms
        const absoluteTime = recording.startTime + videoCurrentTime;
        
        // Show all sensor data from the entire recording
        currentSensorData = recording.sensorData;
        
        // Calculate timeline position (0-1) for highlighting current position
        currentTimelinePosition = videoCurrentTime / recording.duration;
        
        // Find the closest sensor reading to current time
        let closestReading = null;
        let smallestDiff = Infinity;
        
        for (const data of recording.sensorData) {
            const diff = Math.abs(data.timestamp - absoluteTime);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestReading = data;
            }
        }
        
        currentReading = closestReading;
        currentTime = videoCurrentTime;
    }

    function togglePlayback() {
        if (!videoElement) return;
        
        if (isPlaying) {
            videoElement.pause();
        } else {
            videoElement.play();
        }
    }

    function seekTo(seconds: number) {
        if (!videoElement) return;
        videoElement.currentTime = seconds;
        updateSensorData();
    }

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Setup video URL when recording changes
    $: if (recording?.videoBlob) {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
        videoUrl = URL.createObjectURL(recording.videoBlob);
        // Initialize with all sensor data
        currentSensorData = recording.sensorData;
    }

    onMount(() => {
        // Update sensor data every 100ms during playback
        playbackInterval = setInterval(() => {
            if (isPlaying) {
                updateSensorData();
            }
        }, 100);
    });

    onDestroy(() => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
        if (playbackInterval) {
            clearInterval(playbackInterval);
        }
    });
</script>

{#if recording}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b">
                <h2 class="text-xl font-semibold">Recording Playback</h2>
                <button 
                    onclick={onClose}
                    class="text-gray-500 hover:text-gray-700 text-2xl"
                >
                    ×
                </button>
            </div>

            <div class="p-4 space-y-4">
                <!-- Video Player -->
                <div class="relative">
                    <video 
                        bind:this={videoElement}
                        src={videoUrl}
                        class="w-full aspect-video bg-gray-900 rounded-lg object-cover"
                        onplay={() => { isPlaying = true; }}
                        onpause={() => { isPlaying = false; }}
                        ontimeupdate={updateSensorData}
                        onloadedmetadata={updateSensorData}
                    ><track kind="captions" /></video>

                    <!-- Video Controls -->
                    <div class="mt-2 flex items-center space-x-3">
                        <button 
                            onclick={togglePlayback}
                            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                        >
                            {isPlaying ? '⏸️' : '▶️'}
                        </button>
                        
                        <div class="flex-1">
                            <input 
                                type="range" 
                                min="0" 
                                max={recording.duration / 1000}
                                value={currentTime / 1000}
                                oninput={(e) => {
                                    const target = e.target as HTMLInputElement;
                                    seekTo(Number(target.value));
                                }}
                                class="w-full"
                            />
                        </div>
                        
                        <span class="text-sm text-gray-600 font-mono">
                            {formatTime(currentTime / 1000)} / {formatTime(recording.duration / 1000)}
                        </span>
                    </div>
                </div>

                <!-- Current Sensor Reading -->
                {#if currentReading}
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-gray-50 rounded-lg p-3">
                            <div class="text-sm font-medium text-gray-500 mb-1">X-Axis</div>
                            <div class="text-xl font-mono text-blue-600">
                                {currentReading.x.toFixed(3)}
                            </div>
                            <div class="text-xs text-gray-400">m/s²</div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-3">
                            <div class="text-sm font-medium text-gray-500 mb-1">Y-Axis</div>
                            <div class="text-xl font-mono text-green-600">
                                {currentReading.y.toFixed(3)}
                            </div>
                            <div class="text-xs text-gray-400">m/s²</div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-3">
                            <div class="text-sm font-medium text-gray-500 mb-1">Z-Axis</div>
                            <div class="text-xl font-mono text-purple-600">
                                {currentReading.z.toFixed(3)}
                            </div>
                            <div class="text-xs text-gray-400">m/s²</div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-3">
                            <div class="text-sm font-medium text-gray-500 mb-1">Magnitude</div>
                            <div class="text-xl font-mono text-red-600">
                                {Math.sqrt(currentReading.x**2 + currentReading.y**2 + currentReading.z**2).toFixed(3)}
                            </div>
                            <div class="text-xs text-gray-400">m/s²</div>
                        </div>
                    </div>
                {/if}

                <!-- Charts showing all sensor data -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <AccelerometerChart 
                        data={currentSensorData} 
                        maxDataPoints={200} 
                        recordingStartTime={recording.startTime}
                        currentVideoTime={currentTime}
                    />
                    <MagnitudeChart 
                        data={currentSensorData} 
                        maxDataPoints={200} 
                        recordingStartTime={recording.startTime}
                        currentVideoTime={currentTime}
                    />
                </div>

                <!-- Recording Info -->
                <div class="bg-gray-50 rounded-lg p-3">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div class="text-gray-500">Start Time</div>
                            <div class="font-mono">{new Date(recording.startTime).toLocaleString()}</div>
                        </div>
                        <div>
                            <div class="text-gray-500">Duration</div>
                            <div class="font-mono">{formatTime(recording.duration / 1000)}</div>
                        </div>
                        <div>
                            <div class="text-gray-500">Sensor Readings</div>
                            <div class="font-mono">{recording.sensorData.length}</div>
                        </div>
                        <div>
                            <div class="text-gray-500">Video Size</div>
                            <div class="font-mono">{(recording.videoBlob.size / (1024 * 1024)).toFixed(1)} MB</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}
