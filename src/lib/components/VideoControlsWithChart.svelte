<script lang="ts">
    import { onMount } from "svelte";
    import SelectionChart from "$lib/components/SelectionChart.svelte";
    import PoseSkeletonMini from "$lib/components/PoseSkeletonMini.svelte";
    import { LocalStore } from "$lib/localStore";
    import type { AccelerometerDataPoint, PoseDataPoint } from '$lib/types';
    import { normalizeSkeletonToHipCenter } from '$lib/mediapipe';

    type Props = {
        isPlaying: boolean;
        currentTime: number; // ms
        duration: number; // ms
        formatTime: (s: number) => string;
        onToggle: () => void;
        onSeek: (s: number) => void;
        sensorData: Array<AccelerometerDataPoint | PoseDataPoint>;
        recordingStartTime: number;
        minSelectionLength?: number; // ms
        maxSelectionLength?: number; // ms
        savedSelections: Array<{ t0: number; t1: number; label: string }>;
        classLabels?: string[]; // Available class labels for selection
        poseData?: PoseDataPoint[]; // Raw pose data for skeleton display
    };
    
    let {
        isPlaying,
        currentTime,
        duration,
        formatTime,
        onToggle,
        onSeek,
        sensorData,
        recordingStartTime,
        minSelectionLength,
        maxSelectionLength,
        savedSelections = $bindable([]),
        classLabels = ['class A', 'class B'], // Default fallback
        poseData = [],
    }: Props = $props();

    let selectionsStore: LocalStore<Array<{ t0: number; t1: number; label: string }>> | null = null;

    // This async is fine, do not change it to a regular $effect
    $effect(async () => {
        savedSelections;

        if (!selectionsStore) return;

        await selectionsStore.set(savedSelections);
    });

    // Set default min/max selection length (ms)
    minSelectionLength = minSelectionLength ?? 250;
    maxSelectionLength = maxSelectionLength ?? 1000;

    // Chart dimensions
    const width = 600;
    const height = 80;

    let svgEl: SVGSVGElement;
    let actualWidth = $state(width);

    onMount(async () => {
        selectionsStore = await LocalStore.create<Array<{ t0: number; t1: number; label: string }>>(
            `saved-selections-${recordingStartTime}`,
            [],
        );

        savedSelections = await selectionsStore.get();
    });

    onMount(() => {
        if (svgEl) {
            const updateWidth = () => {
                actualWidth = svgEl.clientWidth;
            };
            updateWidth();
            const resizeObserver = new ResizeObserver(updateWidth);
            resizeObserver.observe(svgEl);
            return () => resizeObserver.disconnect();
        }
    });

    // Compute chart points, scale t to actualWidth
    let points = $derived(
        (sensorData.length === 0 || sensorData[0].timestamp === undefined || 
        sensorData[0].x === undefined || sensorData[0].y === undefined || sensorData[0].z === undefined) ? [] :
        sensorData.map((d) => ({
            t: ((d.timestamp - recordingStartTime) / duration) * actualWidth,
            x: d.x,
            y: d.y,
            z: d.z,
        })),
    );

    // Find min/max for scaling
    let minVal = $derived(
        (sensorData.length === 0 || sensorData[0].x === undefined) ? 0 :
        Math.min(...sensorData.map((d) => Math.min(d.x, d.y, d.z)), 0),
    );
    let maxVal = $derived(
        (sensorData.length === 0 || sensorData[0].x === undefined) ? 0 :
        Math.max(...sensorData.map((d) => Math.max(d.x, d.y, d.z)), 0),
    );
    let range = $derived(maxVal - minVal || 1);

    // Scale function
    function scaleY(val: number) {
        return height - ((val - minVal) / range) * height;
    }

    // Selection state (make reactive)
    let isSelecting = $state(false);
    let selectStart: number | null = $state(null); // in px
    let selectEnd: number | null = $state(null); // in px
    let hasSelection = $state(false); // true if a selection exists

    function svgXFromEvent(e: MouseEvent) {
        const rect = svgEl.getBoundingClientRect();
        return Math.max(0, Math.min(actualWidth, e.clientX - rect.left));
    }

    function onSvgMouseDown(e: MouseEvent) {
        console.log('SVG mousedown', e.clientX, e.clientY); // Debug log
        isSelecting = true;
        selectStart = svgXFromEvent(e);
        selectEnd = selectStart;
        hasSelection = false;
        window.addEventListener("mousemove", onSvgMouseMove);
        window.addEventListener("mouseup", onSvgMouseUp);
    }

    function onSvgMouseMove(e: MouseEvent) {
        if (!isSelecting) return;
        let nextEnd = svgXFromEvent(e);
        // Clamp selection to maxSelectionLength
        if (selectStart !== null) {
            const pxPerMs = actualWidth / duration;

            if (maxSelectionLength) {
                // Ensure nextEnd is within maxSelectionLength from selectStart
                const maxPx = maxSelectionLength * pxPerMs;
                if (Math.abs(nextEnd - selectStart) > maxPx) {
                    nextEnd = selectStart + Math.sign(nextEnd - selectStart) * maxPx;
                }
            }
        }
        selectEnd = nextEnd;
        // Seek video to current drag position
        const t = (selectEnd / actualWidth) * duration;
        onSeek(t / 1000); // onSeek expects seconds
    }

    function onSvgMouseUp(e: MouseEvent) {
        if (!isSelecting) return;
        let nextEnd = svgXFromEvent(e);
        // Clamp selection to maxSelectionLength
        if (selectStart !== null) {
            const pxPerMs = actualWidth / duration;
            if (maxSelectionLength){
                const maxPx = maxSelectionLength * pxPerMs;
                if (Math.abs(nextEnd - selectStart) > maxPx) {
                    nextEnd = selectStart + Math.sign(nextEnd - selectStart) * maxPx;
                }
            }
        }
        selectEnd = nextEnd;
        isSelecting = false;
        // Check min selection length
        if (selectStart !== null && selectEnd !== null) {
            const pxPerMs = actualWidth / duration;
            const minPx = (minSelectionLength ?? 0) * pxPerMs;
            if (Math.abs(selectEnd - selectStart) < minPx) {
                selectStart = null;
                selectEnd = null;
                hasSelection = false;
            } else {
                hasSelection = true;
            }
        } else {
            hasSelection = false;
        }
        window.removeEventListener("mousemove", onSvgMouseMove);
        window.removeEventListener("mouseup", onSvgMouseUp);
        // Optionally, emit selection event here
    }

    function getSelectionRange() {
        if (selectStart === null || selectEnd === null) return null;
        const [a, b] = [selectStart, selectEnd].sort((a, b) => a - b);
        return { x: a, width: b - a };
    }

    // Helper to get selection timestamps (in ms, relative to recordingStartTime)
    function getSelectionTimestamps() {
        if (selectStart === null || selectEnd === null) return null;
        const [a, b] = [selectStart, selectEnd].sort((x, y) => x - y);
        const t0 = (a / actualWidth) * duration;
        const t1 = (b / actualWidth) * duration;
        return { t0, t1 };
    }

    // Helper to get selection duration (in ms)
    function getSelectionDuration() {
        const sel = getSelectionTimestamps();
        if (!sel) return null;
        return Math.abs(sel.t1 - sel.t0);
    }

    // Saved selections
    let saveClass: string = $state(classLabels[0] || 'class A');
    
    // Update saveClass when classLabels change
    $effect(() => {
        if (classLabels.length > 0 && !classLabels.includes(saveClass)) {
            saveClass = classLabels[0];
        }
    });

    function saveSelection() {
        const sel = getSelectionTimestamps();
        if (!sel) return;
        savedSelections = [
            ...savedSelections,
            { t0: Math.min(sel.t0, sel.t1), t1: Math.max(sel.t0, sel.t1), label: saveClass }
        ];
        selectStart = null;
        selectEnd = null;
        hasSelection = false;
    }

    // Compute skeleton positions for pose mode
    let skeletonPositions = $derived(() => {
        if (!poseData || poseData.length === 0) return [];
        
        // Sample skeletons every ~500ms for display
        const sampleInterval = 500; // ms
        const skeletons = [];
        
        for (let t = 0; t < duration; t += sampleInterval) {
            const targetTime = recordingStartTime + t;
            // Find closest pose data point
            let closest = null;
            let minDiff = Infinity;
            
            for (const pose of poseData) {
                const diff = Math.abs(pose.timestamp - targetTime);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = pose;
                }
            }
            
            if (closest && minDiff < sampleInterval / 2) {
                // Normalize skeleton to hip center for consistent display
                const normalized = normalizeSkeletonToHipCenter(closest.landmarks);
                skeletons.push({
                    x: (t / duration) * actualWidth,
                    landmarks: normalized
                });
            }
        }
        
        return skeletons;
    });
</script>

<div class="flex items-center space-x-3">
    <button
        onclick={onToggle}
        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
    >
        {isPlaying ? "⏸️" : "▶️"}
    </button>
    <div class="flex-1">
        <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            oninput={(e) => onSeek(Number((e.target as HTMLInputElement).value || 0) / 1000)}
            class="w-full"
        />
        <!-- Use the original SVG for selection/interaction, not SelectionChart -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <svg
            bind:this={svgEl}
            viewBox={`0 0 ${actualWidth} ${height}`}
            height={height}
            class="w-full mt-1"
            onmousedown={onSvgMouseDown}
            style="touch-action:none; user-select:none;"
            aria-label="Sensor data chart"
        >
            <g>
                <!-- X Axis -->
                <line
                    x1="0"
                    y1={height}
                    x2={actualWidth}
                    y2={height}
                    stroke="#ccc"
                    stroke-width="1"
                />
                <!-- Y Axis (optional) -->
                <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={height}
                    stroke="#eee"
                    stroke-width="1"
                />
                <!-- Selection Rectangle -->
                {#if getSelectionRange()}
                    {#key selectStart + '-' + selectEnd}
                        <rect
                            x={getSelectionRange()?.x}
                            y="0"
                            width={getSelectionRange()?.width}
                            height={height}
                            fill="#3b82f6"
                            fill-opacity="0.15"
                            stroke="#3b82f6"
                            stroke-width="1"
                        />
                    {/key}
                {/if}
                <!-- X Line -->
                <polyline
                    fill="none"
                    stroke="#3b82f6"
                    stroke-width="2"
                    points={points.map((p) => `${p.t},${scaleY(p.x)}`).join(" ")}
                />
                <!-- Y Line -->
                <polyline
                    fill="none"
                    stroke="#10b981"
                    stroke-width="2"
                    points={points.map((p) => `${p.t},${scaleY(p.y)}`).join(" ")}
                />
                <!-- Z Line -->
                <polyline
                    fill="none"
                    stroke="#a21caf"
                    stroke-width="2"
                    points={points.map((p) => `${p.t},${scaleY(p.z)}`).join(" ")}
                />
                <!-- Current time marker -->
                <line
                    x1={(currentTime / duration) * actualWidth}
                    y1="0"
                    x2={(currentTime / duration) * actualWidth}
                    y2={height}
                    stroke="#ef4444"
                    stroke-width="2"
                />
                
                <!-- Pose skeletons overlay -->
                {#if poseData && poseData.length > 0}
                    {#each skeletonPositions() as skeleton}
                        <foreignObject 
                            x={skeleton.x - 15} 
                            y={height - 35} 
                            width="30" 
                            height="30"
                            style="pointer-events: none;"
                        >
                            <PoseSkeletonMini 
                                landmarks={skeleton.landmarks} 
                                width={30} 
                                height={30} 
                                color="#666" 
                                pointRadius={1}
                                strokeWidth={1}
                            />
                        </foreignObject>
                    {/each}
                {/if}
            </g>
        </svg>
    </div>
    <span class="text-sm text-gray-600 font-mono">
        {formatTime(currentTime / 1000)} / {formatTime(duration / 1000)}
    </span>
</div>
{#if hasSelection && getSelectionTimestamps()}
    <div style="color: #3b82f6; font-size: 0.9em; margin-top: 0.5em; background: #f0f6ff; border-radius: 0.4em; padding: 0.5em 0.8em; display: inline-block;">
        <div>
            <b>Selected:</b> {formatTime(getSelectionTimestamps()?.t0 ?? 0 / 1000)} → {formatTime(getSelectionTimestamps()?.t1 ?? 0 / 1000)}  
            <span style="opacity:0.7;">({formatTime(getSelectionDuration() ?? 0 / 1000)} duration)</span>
        </div>
        <div style="margin-top:0.5em;">
            <label for="class-select" style="margin-right:0.5em;">Class:</label>
            <select id="class-select" bind:value={saveClass} style="font-size:0.95em;">
                {#each classLabels as opt}
                    <option value={opt}>{opt}</option>
                {/each}
            </select>
            <button
                onclick={saveSelection}
                style="margin-left:0.7em; background:#10b981; color:white; border:none; border-radius:0.3em; padding:0.2em 0.8em; cursor:pointer; font-size:0.95em;"
            >
                Save selection
            </button>
            <button
                onclick={() => { selectStart = null; selectEnd = null; hasSelection = false; }}
                style="margin-left:0.7em; background:#3b82f6; color:white; border:none; border-radius:0.3em; padding:0.2em 0.8em; cursor:pointer; font-size:0.95em;"
            >
                Clear selection
            </button>
        </div>
    </div>
{/if}

{#if savedSelections.length > 0}
    <div style="margin-top:2em;">
        <b>Saved selections by class:</b>
        {#each classLabels as className}
            {#if savedSelections.filter(s => s.label === className).length > 0}
                <div style="margin-top:1em;">
                    <div style="font-weight:bold; color:{className === classLabels[0] ? '#3b82f6' : '#10b981'};">{className}</div>
                    <ul style="margin:0.5em 0 0 0.5em; padding:0; list-style:disc inside;">
                        {#each savedSelections.filter(s => s.label === className) as sel, i}
                            <li style="margin-bottom:0.2em;">
                                <span style="color:#3b82f6;">{formatTime(sel.t0 / 1000)} → {formatTime(sel.t1 / 1000)}</span>
                                <button onclick={() => savedSelections = savedSelections.filter((s, j) => s !== sel)} style="margin-left:0.7em; color:#ef4444; background:none; border:none; cursor:pointer; font-size:0.95em;">✕</button>
                            </li>
                        {/each}
                    </ul>
                    <SelectionChart
                        sensorData={sensorData}
                        recordingStartTime={recordingStartTime}
                        duration={duration}
                        selections={savedSelections.filter(s => s.label === className)}
                        currentTime={currentTime}
                        formatTime={formatTime}
                        width={600}
                        height={60}
                    />
                </div>
            {/if}
        {/each}
    </div>
{/if}

<style>
    svg {
        display: block;
    }
</style>
