<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  export let isPlaying: boolean;
  export let currentTime: number; // ms
  export let duration: number; // ms
  export let formatTime: (s: number) => string;
  export let onToggle: () => void;
  export let onSeek: (s: number) => void;
  export let sensorData: Array<{x: number, y: number, z: number, timestamp: number}> = [];
  export let recordingStartTime: number;

  // Chart dimensions
  const width = 600;
  const height = 80;
  const margin = 20;

  // Compute chart points
  $: points = sensorData.map(d => ({
    t: (d.timestamp - recordingStartTime) / duration * width,
    x: d.x,
    y: d.y,
    z: d.z
  }));

  // Find min/max for scaling
  $: minVal = Math.min(...sensorData.map(d => Math.min(d.x, d.y, d.z)), 0);
  $: maxVal = Math.max(...sensorData.map(d => Math.max(d.x, d.y, d.z)), 0);
  $: range = maxVal - minVal || 1;

  // Scale function
  function scaleY(val: number) {
    return height - ((val - minVal) / range) * height;
  }

  // Current time marker
  $: markerX = (currentTime / duration) * width;
</script>

<div class="flex items-center space-x-3">
  <button onclick={onToggle} class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
    {isPlaying ? '⏸️' : '▶️'}
  </button>
  <div class="flex-1">
    <input
      type="range"
      min="0"
      max={duration}
      value={currentTime}
      oninput={e => onSeek(Number(e.target.value) / 1000)}
      class="w-full"
    />
    <svg width={width} height={height} class="w-full mt-1">
      <!-- X Axis -->
      <line x1="0" y1={height} x2={width} y2={height} stroke="#ccc" stroke-width="1" />
      <!-- Y Axis (optional) -->
      <line x1="0" y1="0" x2="0" y2={height} stroke="#eee" stroke-width="1" />
      <!-- X Line -->
      <polyline
        fill="none"
        stroke="#3b82f6"
        stroke-width="2"
        points={points.map(p => `${p.t},${scaleY(p.x)}`).join(' ')}
      />
      <!-- Y Line -->
      <polyline
        fill="none"
        stroke="#10b981"
        stroke-width="2"
        points={points.map(p => `${p.t},${scaleY(p.y)}`).join(' ')}
      />
      <!-- Z Line -->
      <polyline
        fill="none"
        stroke="#a21caf"
        stroke-width="2"
        points={points.map(p => `${p.t},${scaleY(p.z)}`).join(' ')}
      />
      <!-- Current time marker -->
      <line x1={markerX} y1="0" x2={markerX} y2={height} stroke="#ef4444" stroke-width="2" />
    </svg>
  </div>
  <span class="text-sm text-gray-600 font-mono">
    {formatTime(currentTime / 1000)} / {formatTime(duration / 1000)}
  </span>
</div>

<style>
  svg { display: block; }
</style>
