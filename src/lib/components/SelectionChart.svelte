<script lang="ts">
    import type { AccelerometerDataPoint, PoseDataPoint } from "$lib/types";
    import PoseSkeletonMini from "$lib/components/PoseSkeletonMini.svelte";
    import { getSkeletonPositions } from "$lib/getSkeletonPositions";

    type Props = {
        sensorData: AccelerometerDataPoint[] | PoseDataPoint[];
        recordingStartTime?: number;
        duration?: number;
        selections?: Array<{ t0: number; t1: number; label: string }>;
        currentTime?: number;
        formatTime?: (s: number) => string;
        width?: number;
        height?: number;
    };

    let { sensorData = [], recordingStartTime = 0, duration = 1, selections = [], currentTime = 0, formatTime = (s) => s.toFixed(2), width = 600, height = 80 }: Props = $props();

    let svgEl: SVGSVGElement;
    let actualWidth = $state(width);

    // Responsive width for chart
    import { onMount } from "svelte";
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

    let recordingType: 'accelerometer' | 'pose' | null = $state(null);

    if (sensorData.length > 0) {
        if ('x' in sensorData[0] && 'y' in sensorData[0] && 'z' in sensorData[0]) {
            recordingType = 'accelerometer';
        } else if ('landmarks' in sensorData[0]) {
            recordingType = 'pose';
        }
    }
    
    // Compute chart points, scale t to actualWidth
    let points = $derived(
        recordingType === 'accelerometer' && sensorData.length > 0 && (sensorData[0] as AccelerometerDataPoint).x !== undefined
            ? (sensorData as AccelerometerDataPoint[]).map((d) => ({
                  t: ((d.timestamp - recordingStartTime) / duration) * actualWidth,
                  x: d.x,
                  y: d.y,
                  z: d.z,
              }))
            : []
    );

    // Find min/max for scaling
    let minVal = $derived(
        recordingType === 'accelerometer' && sensorData.length > 0 && (sensorData[0] as AccelerometerDataPoint).x !== undefined
            ? Math.min(...(sensorData as AccelerometerDataPoint[]).map((d) => Math.min(d.x, d.y, d.z)), 0)
            : 0
    );
    let maxVal = $derived(
        recordingType === 'accelerometer' && sensorData.length > 0 && (sensorData[0] as AccelerometerDataPoint).x !== undefined
            ? Math.max(...(sensorData as AccelerometerDataPoint[]).map((d) => Math.max(d.x, d.y, d.z)), 0)
            : 0
    );
    let range = $derived(maxVal - minVal || 1);

    function scaleY(val: number) {
        return height - ((val - minVal) / range) * height;
    }
</script>

<svg
    bind:this={svgEl}
    viewBox={`0 0 ${actualWidth} ${height}`}
    height={height}
    class="w-full mt-1"
    style="touch-action:none; user-select:none;"
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
        <!-- Render saved selections as overlays -->
        {#each selections as sel}
            <rect
                x={(sel.t0 / duration) * actualWidth}
                y="0"
                width={((sel.t1 - sel.t0) / duration) * actualWidth}
                height={height}
                fill={sel.label === 'class A' ? '#3b82f6' : '#10b981'}
                fill-opacity="0.12"
                stroke={sel.label === 'class A' ? '#3b82f6' : '#10b981'}
                stroke-width="1"
            />
        {/each}
        {#if recordingType === 'accelerometer'}
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
        {:else if recordingType === 'pose'}
            <!-- Pose skeletons (mini) -->
            {#each getSkeletonPositions({
                poseData: sensorData as PoseDataPoint[],
                duration,
                recordingStartTime,
                actualWidth,
                sampleInterval: duration / 15
            }) as skeleton}
                <foreignObject
                    x={skeleton.x - 16}
                    y={height / 2 - 16}
                    width={32}
                    height={32}
                    style="pointer-events: none;"
                >
                    <PoseSkeletonMini
                        landmarks={skeleton.landmarks}
                        width={32}
                        height={32}
                        color="#f59e0b"
                        pointRadius={2}
                        strokeWidth={1}
                    />
                </foreignObject>
            {/each}
        {/if}
        <!-- Current time marker -->
        <line
            x1={(currentTime / duration) * actualWidth}
            y1="0"
            x2={(currentTime / duration) * actualWidth}
            y2={height}
            stroke="#ef4444"
            stroke-width="2"
        />
    </g>
</svg>

<style>
    svg {
        display: block;
    }
</style>
