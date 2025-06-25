<script lang="ts">
    import DynamicTimeWarping from "dynamic-time-warping-ts";
    import { LocalStore } from "$lib/localStore";
    import type { Recording, LabeledRecording } from "./LabeledRecordings.ts";
    import MdsPlot from "$lib/components/ui/MdsPlot.svelte";

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
      const seqA = a.map(v => [v[0], v[1], v[2]]);
      const seqB = b.map(v => [v[0], v[1], v[2]]);
      const dtw = new DynamicTimeWarping(seqA, seqB, (x, y) => Math.sqrt(
        Math.pow(x[0] - y[0], 2) +
        Math.pow(x[1] - y[1], 2) +
        Math.pow(x[2] - y[2], 2)
      ));
      return dtw.getDistance();
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
      })();
    });

    // SVG plot settings
    const width = 400;
    const height = 320;
    const padding = 32;
</script>

<div class="bg-white rounded-xl p-8 text-center">
  <h2 class="text-2xl font-bold mb-4">k-Nearest Neighbors Training</h2>
  <p class="text-gray-600 mb-4">Training k-NN is quick and efficient, but may not capture complex patterns.</p>
  <div class="flex flex-col items-center">
    <h3 class="text-lg font-semibold mb-2">MDS Plot of Labeled Segments</h3>
    <MdsPlot
      points={labeledSegments.map(s => s.data)}
      labels={labeledSegments.map(s => s.label)}
      colors={colors}
      distance={dtwDistance}
      width={width}
      height={height}
      padding={padding}
    />
    {#if labeledSegments.length >= 2}
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
