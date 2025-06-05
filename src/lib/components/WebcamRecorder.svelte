<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    export let onRecordingStart: ((startTime: number) => void) | undefined = undefined;
    export let onRecordingStop: ((endTime: number, videoBlob: Blob) => void) | undefined = undefined;
    export let onRecordingData: ((timestamp: number) => void) | undefined = undefined;

    let videoElement: HTMLVideoElement;
    let stream: MediaStream | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    let recordedChunks: Blob[] = [];
    let isRecording = false;
    let hasPermission = false;
    let permissionError = '';
    let recordingStartTime = 0;
    let recordingDuration = 0;
    let durationInterval: ReturnType<typeof setInterval> | null = null;

    // Request webcam access
    async function requestWebcamAccess() {
        try {
            permissionError = '';
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 }, 
                audio: false 
            });
            
            if (videoElement) {
                videoElement.srcObject = stream;
            }
            
            hasPermission = true;
            console.log('Webcam access granted');
        } catch (error) {
            console.error('Error accessing webcam:', error);
            hasPermission = false;
            if (error instanceof Error) {
                permissionError = error.message;
            } else {
                permissionError = 'Failed to access webcam';
            }
        }
    }

    // Start recording
    async function startRecording() {
        if (!stream || !hasPermission) {
            await requestWebcamAccess();
            if (!stream) return;
        }

        try {
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                const endTime = Date.now();
                onRecordingStop?.(endTime, videoBlob);
                
                // Stop duration tracking
                if (durationInterval) {
                    clearInterval(durationInterval);
                    durationInterval = null;
                }
            };

            mediaRecorder.start(100); // Record in 100ms chunks
            isRecording = true;
            recordingStartTime = Date.now();
            
            // Start duration tracking
            durationInterval = setInterval(() => {
                recordingDuration = Date.now() - recordingStartTime;
                // Notify parent component of recording progress
                onRecordingData?.(Date.now());
            }, 100);

            onRecordingStart?.(recordingStartTime);
            console.log('Recording started');
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }

    // Stop recording
    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            recordingDuration = 0;
            console.log('Recording stopped');
        }
    }

    // Format duration for display
    function formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const remainingMs = Math.floor((ms % 1000) / 100);
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs}`;
    }

    // Cleanup on component destroy
    onDestroy(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (durationInterval) {
            clearInterval(durationInterval);
        }
    });

    // Auto-request permission on mount
    onMount(() => {
        requestWebcamAccess();
    });
</script>

<div class="bg-white rounded-lg p-4 shadow-sm">
    <div class="flex items-center justify-between mb-4">
        <h3 class="font-medium text-gray-900">Webcam Recording</h3>
        <div class="flex items-center space-x-2">
            {#if isRecording}
                <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span class="text-sm text-red-600 font-mono">
                    {formatDuration(recordingDuration)}
                </span>
            {:else}
                <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span class="text-sm text-gray-600">Ready</span>
            {/if}
        </div>
    </div>

    <!-- Video Preview -->
    <div class="relative mb-4">
        <video 
            bind:this={videoElement}
            autoplay 
            muted 
            playsinline
            class="w-full aspect-video bg-gray-900 rounded-lg object-cover"
        ></video>
        
        {#if !hasPermission}
            <div class="absolute inset-0 bg-gray-900 rounded-lg flex items-center justify-center">
                <div class="text-center text-white">
                    <div class="text-4xl mb-2">📹</div>
                    <p class="text-sm mb-3">Camera access required</p>
                    {#if permissionError}
                        <p class="text-xs text-red-300 mb-3">{permissionError}</p>
                    {/if}
                    <button 
                        onclick={requestWebcamAccess}
                        class="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm transition-colors"
                    >
                        Enable Camera
                    </button>
                </div>
            </div>
        {/if}

        {#if isRecording}
            <div class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>REC</span>
            </div>
        {/if}
    </div>

    <!-- Recording Controls -->
    <div class="flex space-x-2">
        {#if !isRecording}
            <button 
                onclick={startRecording}
                disabled={!hasPermission}
                class="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
                <span>🔴</span>
                <span>Start Recording</span>
            </button>
        {:else}
            <button 
                onclick={stopRecording}
                class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
                <span>⏹️</span>
                <span>Stop Recording</span>
            </button>
        {/if}
        
        {#if !hasPermission && permissionError}
            <button 
                onclick={requestWebcamAccess}
                class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm transition-colors"
            >
                Retry
            </button>
        {/if}
    </div>

    <!-- Recording Status -->
    {#if isRecording}
        <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-center space-x-2 text-sm text-red-700">
                <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>Recording video and sensor data synchronously</span>
            </div>
        </div>
    {/if}
</div>
