<script lang="ts">
    import { mdsClassic } from "$lib/mds";
    import DynamicTimeWarping from "dynamic-time-warping-ts";
    import { LocalStore } from "$lib/localStore";
    import type { Recording, LabeledRecording } from "./LabeledRecordings.ts";

    // Accept recordings as prop
    type Props = { recordings: Recording[] };
    let { recordings }: Props = $props();

    // State for labeled segments and MDS points
    let labeledSegments: Array<LabeledRecording & { data: number[][] }> = $state([]);
    let mdsPoints: number[][] = $state([]);
    let labels: string[] = $state([]);
    let colors: Record<string, string> = $derived(
      Array.from(new Set(labels)).reduce((acc, label, i) => {
        // Tailwind palette, fallback to gray
        const palette = [
          "#2563eb", // blue-600
          "#16a34a", // green-600
          "#dc2626", // red-600
          "#f59e42", // orange-400
          "#a21caf", // purple-700
          "#eab308", // yellow-500
          "#0ea5e9", // sky-500
          "#7c3aed", // violet-600
          "#f43f5e", // pink-500
          "#64748b", // slate-500
        ];
        acc[label] = palette[i % palette.length] || "#888";
        return acc;
      }, {} as Record<string, string>)
    );

    // Helper: get sensor data for a labeled segment
    function getLabeledSensorData(labeled: LabeledRecording, recordings: Recording[]): number[][] {
      const parent = recordings.find(r => r.startTime === labeled.recordingStartTime);
      if (!parent) return [];
      const t0Abs = labeled.t0 < 1e12 ? labeled.recordingStartTime + labeled.t0 : labeled.t0;
      const t1Abs = labeled.t1 < 1e12 ? labeled.recordingStartTime + labeled.t1 : labeled.t1;
      // Return as array of [x, y, z]
      return parent.sensorData
        .filter(d => d.timestamp >= t0Abs && d.timestamp <= t1Abs)
        .map(d => [d.x, d.y, d.z]);
    }

    // Load all labeled segments for all recordings
    async function loadLabeledSegments() {
      const all: Array<LabeledRecording & { data: number[][] }> = [];
      for (const recording of recordings) {
        const stored = await LocalStore.get<Array<{ t0: number; t1: number; label: string }>>(
          `saved-selections-${recording.startTime}`,
          []
        );
        for (const r of stored || []) {
          const labeled: LabeledRecording = {
            recordingStartTime: recording.startTime,
            t0: r.t0,
            t1: r.t1,
            label: r.label
          };
          const data = getLabeledSensorData(labeled, recordings);
          if (data.length > 0) {
            all.push({ ...labeled, data });
          }
        }
      }
      return all;
    }

    // Compute DTW distance between two segments
    function dtwDistance(a: number[][], b: number[][]): number {
      // Use only magnitude for simplicity
      const seqA = a.map(v => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2));
      const seqB = b.map(v => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2));
      const dtw = new DynamicTimeWarping(seqA, seqB, (x, y) => Math.abs(x - y));
      return dtw.getDistance();
    }

    // Compute distance matrix for all segments
    function computeDistanceMatrix(segments: Array<LabeledRecording & { data: number[][] }>): number[][] {
      const n = segments.length;
      const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
      for (let i = 0; i < n; ++i) {
        for (let j = i + 1; j < n; ++j) {
          const d = dtwDistance(segments[i].data, segments[j].data);
          dist[i][j] = dist[j][i] = d;
        }
      }
      return dist;
    }

    // Effect: load segments and compute MDS
    $effect(() => {
      if (!recordings || recordings.length === 0) {
        labeledSegments = [];
        mdsPoints = [];
        labels = [];
        return;
      }
      (async () => {
        const segs = await loadLabeledSegments();
        labeledSegments = segs;
        labels = segs.map(s => s.label);
        if (segs.length < 2) {
          mdsPoints = [];
          return;
        }
        const dist = computeDistanceMatrix(segs);
        mdsPoints = mdsClassic(dist, 2);
      })();
    });

    // SVG plot settings
    const width = 400;
    const height = 320;
    const padding = 32;

    // Derived: scale MDS points to fit SVG
    const scaledPoints = $derived(() => {
      if (!mdsPoints || mdsPoints.length === 0) return [];
      const xs = mdsPoints.map(p => p[0]);
      const ys = mdsPoints.map(p => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      return mdsPoints.map(([x, y]) => [
        padding + ((x - minX) / (maxX - minX || 1)) * (width - 2 * padding),
        height - (padding + ((y - minY) / (maxY - minY || 1)) * (height - 2 * padding))
      ]);
    });

    // Helper to get array for #each
    function getScaledPoints(): number[][] {
      return Array.isArray(scaledPoints) ? scaledPoints : (typeof scaledPoints === 'function' ? scaledPoints() : []);
    }
</script>

<div class="bg-white rounded-xl p-8 text-center">
  <h2 class="text-2xl font-bold mb-4">k-Nearest Neighbors Training</h2>
  <p class="text-gray-600 mb-4">Training k-NN is quick and efficient, but may not capture complex patterns.</p>
  <div class="flex flex-col items-center">
    <h3 class="text-lg font-semibold mb-2">MDS Plot of Labeled Segments</h3>
    {#if labeledSegments.length < 2}
      <div class="text-gray-400 text-sm py-8">Not enough labeled segments to plot.</div>
    {:else}
      <svg width={width} height={height} class="bg-gray-50 rounded border border-gray-200">
        {#each getScaledPoints() as [x, y], i}
          <circle
            cx={x}
            cy={y}
            r="10"
            fill={colors[labeledSegments[i].label]}
            fill-opacity="0.7"
            stroke="#222"
            stroke-width="1.5"
          />
        {/each}
        {#each getScaledPoints() as [x, y], i}
          <text
            x={x}
            y={y - 14}
            text-anchor="middle"
            class="text-xs font-semibold"
            fill="#222"
          >
            {labeledSegments[i].label}
          </text>
        {/each}
      </svg>
      <div class="flex flex-wrap gap-4 mt-4 justify-center">
        {#each Array.from(new Set(labels)) as label}
          <div class="flex items-center gap-2 text-sm">
            <span class="inline-block w-4 h-4 rounded-full" style={`background:${colors[label]}`}></span>
            <span>{label}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
