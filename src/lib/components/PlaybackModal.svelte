<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import VideoControlsWithChart from './VideoControlsWithChart.svelte';

    type Props = {
        recording: {
            id: string;
            startTime: number;
            endTime: number;
            videoBlob: Blob;
            sensorData: Array<{x: number, y: number, z: number, timestamp: number}>;
            duration: number;
        } | null;
        onClose?: () => void;
        savedSelections?: Array<{t0: number, t1: number, label: string}>;
    };

    let { recording, onClose = () => {}, savedSelections = $bindable([]) }: Props = $props();

    let videoElement: HTMLVideoElement | null = $state(null);
    let isPlaying = $state(false);
    let currentTime = $state(0); // Current playback time in seconds
    let videoUrl = $state<string>('');
    let playbackInterval: ReturnType<typeof setInterval> | null = null;
    
    // Full sensor data and current position
    let currentSensorData: Array<{x: number, y: number, z: number, timestamp: number}> = $state([]);
    let currentReading: {x: number, y: number, z: number, timestamp: number} | null = null;
    let currentTimelinePosition = $state(0); // Position in the timeline (0-1)
    let videoDuration = $state(0); // Duration in milliseconds
    let videoReady = $state(false); // Whether video metadata is ready

    // Sync sensor data with video playback
    function updateSensorData() {
        if (!recording || !videoElement) return;

        // Get video duration in ms (prefer video element's duration if finite)
        if (Number.isFinite(videoElement.duration) && videoElement.duration > 0) {
            videoDuration = videoElement.duration * 1000;
        } else {
            videoDuration = recording.duration;
        }

        const videoCurrentTime = videoElement.currentTime * 1000; // ms
        const absoluteTime = recording.startTime + videoCurrentTime;
        
        // Show all sensor data from the entire recording
        currentSensorData = recording.sensorData;
        
        // Calculate timeline position (0-1) for highlighting current position
        currentTimelinePosition = videoCurrentTime / videoDuration;
        
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

        if (mins >= 1) {
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `00:${secs.toString().padStart(2, '0')}.${Math.floor((seconds % 1) * 100).toString().padStart(2, '0')}`;
        }
    }

    // Setup video URL when recording changes (Svelte 5 style)
    let prevBlob: Blob | null = null;
    $effect(() => {
        if (recording?.videoBlob !== prevBlob) {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
                videoUrl = '';
            }
            if (recording?.videoBlob) {
                videoUrl = URL.createObjectURL(recording.videoBlob);
            }
            prevBlob = recording?.videoBlob ?? null;
        }
    });

    onMount(() => {
        // Update sensor data every 50ms during playback
        playbackInterval = setInterval(() => {
            if (isPlaying) {
                updateSensorData();
            }
        }, 50);
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
                        preload="metadata"
                        src={videoUrl}
                        class="w-full aspect-video bg-gray-900 rounded-lg object-cover"
                        onplay={() => { isPlaying = true; }}
                        onpause={() => { isPlaying = false; }}
                        ontimeupdate={updateSensorData}
                        onloadedmetadata={() => {
                            console.log('Video metadata loaded, duration:', videoElement?.duration);
                            videoReady = true;
                            if (videoElement && Number.isFinite(videoElement.duration) && videoElement.duration > 0) {
                                videoDuration = videoElement.duration * 1000;
                            }
                            updateSensorData();
                        }}
                        ondurationchange={() => {
                            if (!videoElement) return;
                            console.log('Video duration changed:', videoElement?.duration);
                            if (Number.isFinite(videoElement?.duration) && videoElement?.duration > 0) {
                                videoDuration = videoElement?.duration * 1000;
                            }
                        }}
                    ><track kind="captions" /></video>

                    {#if videoReady}
                        <!-- Video Controls with Chart -->
                        <VideoControlsWithChart
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            duration={videoDuration}
                            formatTime={formatTime}
                            onToggle={togglePlayback}
                            onSeek={seekTo}
                            sensorData={currentSensorData}
                            recordingStartTime={recording.startTime}
                            {savedSelections}
                        />
                    {:else}
                        <div class="flex items-center justify-center h-32"><span>Loading video metadata…</span></div>
                    {/if}
                </div>


                <!-- Recording Info -->
                {#if videoReady}
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <div class="text-gray-500">Start Time</div>
                                <div class="font-mono">{new Date(recording.startTime).toLocaleString()}</div>
                            </div>
                            <div>
                                <div class="text-gray-500">Duration</div>
                                <div class="font-mono">{Number.isFinite(videoDuration) && videoDuration > 0 ? formatTime(videoDuration / 1000) : formatTime(recording.duration / 1000)}</div>
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
                {/if}
            </div>
        </div>
    </div>
{/if}
