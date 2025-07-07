<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { DrawingUtils, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
    import type { PoseDataPoint, Vector3 } from '$lib/types';
    import { getGlobalPoseDetector, cleanupGlobalDetector, convertToPixelCoordinates, MediaPipePoseDetector, drawPoseLandmarks } from '$lib/mediapipe';

    type Props = {
        onRecordingStart?: (startTime: number) => void;
        onRecordingStop?: (endTime: number, videoBlob: Blob, poseData?: PoseDataPoint[]) => void;
        onRecordingData?: (timestamp: number) => void;
        allowRecording?: boolean;
        enablePoseDetection?: boolean;
    };
    let {
        onRecordingStart = undefined,
        onRecordingStop = undefined,
        onRecordingData = undefined,
        allowRecording = true,
        enablePoseDetection = false
    }: Props = $props();

    let videoElement: HTMLVideoElement;
    let stream: MediaStream | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    let recordedChunks: Blob[] = [];
    let isRecording = $state(false);
    let hasPermission = $state(false);
    let permissionError = $state('');
    let recordingStartTime = 0;
    let recordingDuration = $state(0);
    let durationInterval: ReturnType<typeof setInterval> | null = null;
    let poseReady = $state(false);
    let poseError = $state('');
    let poseRecordingData: PoseDataPoint[] = $state([]);
    let poseDetector: MediaPipePoseDetector | null = null;

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
        if (!allowRecording) return;

        if (!stream || !hasPermission) {
            await requestWebcamAccess();
            if (!stream) return;
        }

        poseRecordingData = []; // Reset pose data for new recording

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

            if (mediaRecorder) {
                mediaRecorder.onstop = (event: Event) => {
                    const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                    const endTime = Date.now();
                    if (enablePoseDetection) {
                        onRecordingStop?.(endTime, videoBlob, poseRecordingData);
                    } else {
                        onRecordingStop?.(endTime, videoBlob);
                    }
                    // Stop duration tracking
                    if (durationInterval) {
                        clearInterval(durationInterval);
                        durationInterval = null;
                    }
                };
            }

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
        stopPoseDetectionLoop();
        cleanupGlobalDetector();
    });

    // Auto-request permission on mount
    onMount(() => {
        requestWebcamAccess();
    });

    async function setupPoseDetection() {
        poseError = '';
        poseReady = false;
        try {
            poseDetector = await getGlobalPoseDetector();
            poseReady = true;
            if (enablePoseDetection && poseReady && videoElement) {
                startPoseDetectionLoop();
            }
        } catch (e) {
            poseError = e instanceof Error ? e.message : 'Failed to load pose detection';
            poseReady = false;
        }
    }

    let poseDetectionFrame: number | null = null;

    function startPoseDetectionLoop() {
        if (!enablePoseDetection || !poseReady || !videoElement || !poseDetector) return;
        const detect = () => {
            if (!enablePoseDetection || !poseReady || !videoElement || !poseDetector) return;
            if (videoElement.readyState >= 2) {
                const landmarks = poseDetector.detectPose(videoElement);
                
                if (landmarks && landmarks.landmarks.length > 0) {
                    if (isRecording) {
                        poseRecordingData.push({
                            timestamp: performance.now(),
                            landmarks: landmarks.landmarks,
                            videoLandmarks: landmarks.videoLandmarks,
                        });
                    }

                    let normalizedLandmarks = landmarks.videoLandmarks.map((l: Vector3) => ({
                        x: l.x,
                        y: l.y,
                        z: l.z,
                        visibility: l.x >= 0 && l.x <= 1 && l.y >= 0 && l.y <= 1 ? 1 : 0
                    }));

                    if(poseCanvas && videoElement) {
                        drawPoseLandmarks(poseCanvas, videoElement, normalizedLandmarks);
                    }
                } else if (poseCanvas) {
                    const ctx = poseCanvas.getContext('2d');
                    if (ctx) ctx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
                }
            }
            poseDetectionFrame = requestAnimationFrame(detect);
        };
        poseDetectionFrame = requestAnimationFrame(detect);
    }

    function stopPoseDetectionLoop() {
        if (poseDetectionFrame !== null) {
            cancelAnimationFrame(poseDetectionFrame);
            poseDetectionFrame = null;
        }
        if (poseCanvas) {
            const ctx = poseCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, poseCanvas.width, poseCanvas.height);
        }
    }

    $effect(() => {
        if (enablePoseDetection && poseReady && videoElement && poseDetector) {
            startPoseDetectionLoop();
        } else {
            stopPoseDetectionLoop();
        }
    });

    let poseCanvas: HTMLCanvasElement | null = $state(null);

    $effect(() => {
        if (enablePoseDetection && !poseReady) {
            setupPoseDetection();
        }
    });

    $effect(() => {
        if (!enablePoseDetection && poseDetectionFrame !== null) {
            stopPoseDetectionLoop();
        }
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
        {#if enablePoseDetection}
            <canvas
                bind:this={poseCanvas}
                class="absolute inset-0 w-full h-full pointer-events-none"
                style="z-index:10;"
            ></canvas>
        {/if}
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
    {#if allowRecording}
        <div class="flex space-x-2">
            {#if !isRecording}
                <button 
                    onclick={startRecording}
                    disabled={!hasPermission || !allowRecording || (!poseReady && enablePoseDetection)}
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
    {/if}

    <!-- Pose Detection Control -->
    <div class="flex items-center gap-4 mb-4">
        {#if enablePoseDetection}
            {#if !poseReady && !poseError}
                <span class="text-xs text-gray-500">Loading pose model...</span>
            {:else if poseError}
                <span class="text-xs text-red-500">{poseError}</span>
            {/if}
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
