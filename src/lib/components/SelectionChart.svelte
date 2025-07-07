<script lang="ts">
    import type { AccelerometerDataPoint, PoseDataPoint } from "$lib/types";

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
    let actualWidth = width;

    let recordingType: 'accelerometer' | 'pose' | null = $state(null);

    if (sensorData.length > 0) {
        if ('x' in sensorData[0] && 'y' in sensorData[0] && 'z' in sensorData[0]) {
            recordingType = 'accelerometer';
        } else if ('landmarks' in sensorData[0]) {
            recordingType = 'pose';
        }
    }
    
    // Compute chart points, scale t to actualWidth
    let points = $derived((sensorData.length > 0 && sensorData[0].x !== undefined) ? (sensorData as AccelerometerDataPoint[]).map((d) => ({
        t: ((d.timestamp - recordingStartTime) / duration) * actualWidth,
        x: d.x,
        y: d.y,
        z: d.z,
    })) : []);

    // Find min/max for scaling
    let minVal = $derived((sensorData.length > 0 && sensorData[0].x !== undefined) ? Math.min(...(sensorData as AccelerometerDataPoint[]).map((d) => Math.min(d.x, d.y, d.z)), 0) : 0);
    let maxVal = $derived((sensorData.length > 0 && sensorData[0].x !== undefined) ? Math.max(...(sensorData as AccelerometerDataPoint[]).map((d) => Math.max(d.x, d.y, d.z)), 0) : 0);
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
            <!-- Pose landmarks (if available) -->
            {#each sensorData as point}
                {#if 'landmarks' in point}
                    {#each point.landmarks as landmark}
                        <circle
                            cx={(landmark.x / 1) * actualWidth}
                            cy={scaleY(landmark.y)}
                            r="3"
                            fill="#f59e0b"
                            stroke="#f59e0b"
                            stroke-width="1"
                        />
                    {/each}
                {/if}
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
