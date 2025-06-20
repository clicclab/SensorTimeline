<script lang="ts">
    import { onMount } from "svelte";

    type Props = {
        isPlaying: boolean;
        currentTime: number; // ms
        duration: number; // ms
        formatTime: (s: number) => string;
        onToggle: () => void;
        onSeek: (s: number) => void;
        sensorData: Array<{
            x: number;
            y: number;
            z: number;
            timestamp: number;
        }>;
        recordingStartTime: number;
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
    }: Props = $props();

    // Chart dimensions
    const width = 600;
    const height = 80;

    let svgEl: SVGSVGElement;
    let actualWidth = $state(width);

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
        sensorData.map((d) => ({
            t: ((d.timestamp - recordingStartTime) / duration) * actualWidth,
            x: d.x,
            y: d.y,
            z: d.z,
        })),
    );

    // Find min/max for scaling
    let minVal = $derived(
        Math.min(...sensorData.map((d) => Math.min(d.x, d.y, d.z)), 0),
    );
    let maxVal = $derived(
        Math.max(...sensorData.map((d) => Math.max(d.x, d.y, d.z)), 0),
    );
    let range = $derived(maxVal - minVal || 1);

    // Scale function
    function scaleY(val: number) {
        return height - ((val - minVal) / range) * height;
    }

    // Current time marker
    let markerX = $derived((currentTime / duration) * actualWidth);
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
        <svg
            bind:this={svgEl}
            viewBox={`0 0 ${actualWidth} ${height}`}
            height={height}
            class="w-full mt-1"
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
    </div>
    <span class="text-sm text-gray-600 font-mono">
        {formatTime(currentTime / 1000)} / {formatTime(duration / 1000)}
    </span>
</div>

<style>
    svg {
        display: block;
    }
</style>
