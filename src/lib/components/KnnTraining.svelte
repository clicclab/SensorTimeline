<script lang="ts">
    import { LocalStore } from "$lib/localStore";
    import type { Recording, LabeledRecording } from "./LabeledRecordings.ts";
    import MdsPlot from "$lib/components/ui/MdsPlot.svelte";
    import { createKnnClassifierModel, classifyWithKnnModel, type KnnClassifierModel } from "$lib/knn";
    import { modelStore } from "$lib/modelStore.js";
import { dtwDistance } from "$lib/dtw";
    import { normalizeSkeletonToHipCenter } from "$lib/mediapipe.js";
    import type { AccelerometerDataPoint, PoseDataPoint } from "$lib/types.js";
    import { filterToUsedLandmarks } from "$lib/poseLandmarks.js";

    // Accept recordings as prop
    type Props = { recordings: Recording[] };
    let { recordings }: Props = $props();

    let recordingType: 'accelerometer' | 'pose' | null = $state(null);
    if (recordings.length > 0) {
      if ('x' in recordings[0].sensorData[0] && 'y' in recordings[0].sensorData[0] && 'z' in recordings[0].sensorData[0]) {
        recordingType = 'accelerometer';
      } else if ('landmarks' in recordings[0].sensorData[0]) {
        recordingType = 'pose';
      }
    }

    // State for labeled segments and MDS points
    let labeledSegments: Array<LabeledRecording & { data: number[][] }> = $state([]);
    let mdsPoints: number[][] = $state([]);
    let distanceMatrix: number[][] = $state([]);
    let labels: string[] = $state([]);
    let k = $state(3);
    let maxDistance = $state(0.5);
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
      const points = parent.sensorData
        .filter(d => d.timestamp >= t0Abs && d.timestamp <= t1Abs);

      if (recordingType === 'pose') {
        return (points as PoseDataPoint[]).map(d => {
          if ('landmarks' in d) {
            // Normalize landmarks to hip center
            let normalized = normalizeSkeletonToHipCenter(d.landmarks);
            normalized = filterToUsedLandmarks(normalized);
            return normalized.flatMap(p => [p.x, p.y, p.z]);
          }
          return [];
        });
      } else if (recordingType === 'accelerometer') {
        return (points as AccelerometerDataPoint[]).map(d => [d.x, d.y, d.z]);
      }
      return [];
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
      console.log("Loaded labeled segments:", all);
      return all;
    }

    // Effect: load segments and cache DTW distance matrix
    $effect(() => {
      if (!recordings || recordings.length === 0) {
        labeledSegments = [];
        distanceMatrix = [];
        labels = [];
        return;
      }
      (async () => {
        const segs = await loadLabeledSegments();
        labeledSegments = segs;
        labels = segs.map(s => s.label);
        if (segs.length < 2) {
          distanceMatrix = [];
          return;
        }
        const n = segs.length;
        const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; ++i) {
          for (let j = i + 1; j < n; ++j) {
            const d = dtwDistance(segs[i].data, segs[j].data);
            dist[i][j] = dist[j][i] = d;
          }
        }
        distanceMatrix = dist;
      })();
    });

    // Effect: compute and cache MDS projection when distanceMatrix changes
    $effect(async () => {
      if (!distanceMatrix || distanceMatrix.length < 2) {
        mdsPoints = [];
        return;
      }
      const { mdsClassic } = await import("$lib/mds");
      ({ points: mdsPoints } = mdsClassic(distanceMatrix, 2));
    });


    // Overlay function for MDS plot, using kNN in 2D, fully optimized and memoized
    const normalizedMdsPoints = $derived.by(() => {
        if (mdsPoints.length < 2) return [];
        const xs = mdsPoints.map(p => p[0]);
        const ys = mdsPoints.map(p => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        return mdsPoints.map((pt, i) => ({
            label: labeledSegments[i].label,
            point: [
                (pt[0] - minX) / (maxX - minX || 1),
                (pt[1] - minY) / (maxY - minY || 1)
            ]
        }));
    });

    let mdsOverlayFn: ((x: number, y: number) => string | undefined) = $derived.by(() => {
        if (!normalizedMdsPoints || normalizedMdsPoints.length < 2) return () => undefined;
        return (x: number, y: number) => {
            const dists = normalizedMdsPoints.map(({ label, point }) => ({
                label,
                dist: Math.hypot(point[0] - x, point[1] - y)
            }));
            dists.sort((a, b) => a.dist - b.dist);
            const neighbors = dists.slice(0, k).filter(n => n.dist <= maxDistance);
            if (neighbors.length === 0) return undefined;
            const counts = neighbors.reduce<Record<string, number>>((acc, n) => {
                acc[n.label] = (acc[n.label] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        };
    });

    // SVG plot settings
    const width = 400;
    const height = 320;
    const padding = 32;
</script>

<div class="bg-white rounded-xl p-8 text-center">
  <h2 class="text-2xl font-bold mb-4">k-Nearest Neighbors Training</h2>
  <p class="text-gray-600 mb-4">Training k-NN is quick and efficient, but may not capture complex patterns.</p>
  <div class="flex flex-col sm:flex-row gap-4 mb-6 justify-center items-center">
    <label class="flex flex-col items-center gap-2 w-48">
      <span class="font-medium">k</span>
      <input
        type="range"
        min="1"
        max={Math.max(1, labeledSegments.length)}
        step="1"
        bind:value={k}
        class="w-full accent-blue-600"
        aria-label="Number of neighbors (k)"
      />
      <span class="text-xs text-gray-500">{k}</span>
    </label>
    <label class="flex flex-col items-center gap-2 w-64">
      <span class="font-medium">Max Distance</span>
      <input
        type="range"
        min="0.2"
        max="1"
        step="0.1"
        bind:value={maxDistance}
        class="w-full accent-blue-600"
        aria-label="Maximum distance threshold"
      />
      <span class="text-xs text-gray-500">{maxDistance}</span>
    </label>
  </div>
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
      overlay={mdsOverlayFn}
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
