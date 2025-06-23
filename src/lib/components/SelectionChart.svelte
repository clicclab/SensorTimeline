<script lang="ts">
    export let sensorData: Array<{ x: number; y: number; z: number; timestamp: number }> = [];
    export let recordingStartTime: number = 0;
    export let duration: number = 1;
    export let selections: Array<{ t0: number; t1: number; label: string }> = [];
    export let currentTime: number = 0;
    export let formatTime: (s: number) => string = (s) => s.toFixed(2);
    export let width: number = 600;
    export let height: number = 80;

    let svgEl: SVGSVGElement;
    let actualWidth = width;

    // Compute chart points, scale t to actualWidth
    $: points = sensorData.map((d) => ({
        t: ((d.timestamp - recordingStartTime) / duration) * actualWidth,
        x: d.x,
        y: d.y,
        z: d.z,
    }));

    // Find min/max for scaling
    $: minVal = Math.min(...sensorData.map((d) => Math.min(d.x, d.y, d.z)), 0);
    $: maxVal = Math.max(...sensorData.map((d) => Math.max(d.x, d.y, d.z)), 0);
    $: range = maxVal - minVal || 1;

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
    </g>
</svg>

<style>
    svg {
        display: block;
    }
</style>
