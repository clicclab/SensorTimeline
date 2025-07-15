<script lang="ts">
  import type { Recording, LabeledRecording } from "./LabeledRecordings.ts";
  import {
    trainNNClassifier,
    nnPredict,
    type NNClassifierModel,
  } from "$lib/nn";
  import MdsPlot from "$lib/components/ui/MdsPlot.svelte";
  import { LocalStore } from "$lib/localStore.js";
  import { dtwDistance } from "$lib/dtw";
  import { modelStore } from "$lib/modelStore";
  import type { AccelerometerDataPoint, PoseDataPoint } from "$lib/types.js";
  import { normalizeSkeletonToHipCenter } from "$lib/mediapipe.js";
  import { filterToUsedLandmarks } from "$lib/poseLandmarks.js";
    import { tick } from "svelte";

  // Accept recordings as prop
  type Props = { recordings: Recording[] };
  let { recordings }: Props = $props();

  let recordingType: "accelerometer" | "pose" | null = $state(null);
  if (recordings.length > 0) {
    if (
      "x" in recordings[0].sensorData[0] &&
      "y" in recordings[0].sensorData[0] &&
      "z" in recordings[0].sensorData[0]
    ) {
      recordingType = "accelerometer";
    } else if ("landmarks" in recordings[0].sensorData[0]) {
      recordingType = "pose";
    }
  }

  let labeledSegments: Array<LabeledRecording & { data: number[][] }> = $state(
    [],
  );
  let labels: string[] = $state([]);

  // Placeholder for neural network parameters
  let epochs = $state(30);
  let learningRate = $state(0.002);
  let hiddenUnits = $state(16);

  // Placeholder for training state
  let isTraining = $state(false);
  let trainLoss: number[] = $state([]);

  let nnModel: NNClassifierModel | null = $state(null);
  let mdsPoints: number[][] = $state([]);
  // Remove overlay logic and instead compute predicted labels for each training point
  let predictedLabels: string[] = $state([]);

  // Helper: get sensor data for a labeled segment
  function getLabeledSensorData(
    labeled: LabeledRecording,
    recordings: Recording[],
  ): number[][] {
    const parent = recordings.find(
      (r) => r.startTime === labeled.recordingStartTime,
    );
    if (!parent) return [];
    const t0Abs =
      labeled.t0 < 1e12 ? labeled.recordingStartTime + labeled.t0 : labeled.t0;
    const t1Abs =
      labeled.t1 < 1e12 ? labeled.recordingStartTime + labeled.t1 : labeled.t1;

    // Return as array of [x, y, z]
    const points = parent.sensorData.filter(
      (d) => d.timestamp >= t0Abs && d.timestamp <= t1Abs,
    );

    if (recordingType === "pose") {
      return (points as PoseDataPoint[]).map((d) => {
        if ("landmarks" in d) {
          // Normalize landmarks to hip center
          let normalized = normalizeSkeletonToHipCenter(d.landmarks);
          normalized = filterToUsedLandmarks(normalized);
          return normalized.flatMap((p) => [p.x, p.y, p.z]);
        }
        return [];
      });
    } else if (recordingType === "accelerometer") {
      return (points as AccelerometerDataPoint[]).map((d) => [d.x, d.y, d.z]);
    }
    return [];
  }

  // Load all labeled segments for all recordings
  async function loadLabeledSegments() {
    const all: Array<LabeledRecording & { data: number[][] }> = [];
    for (const recording of recordings) {
      const stored = await LocalStore.get<
        Array<{ t0: number; t1: number; label: string }>
      >(`saved-selections-${recording.startTime}`, []);
      for (const r of stored || []) {
        const labeled: LabeledRecording = {
          recordingStartTime: recording.startTime,
          t0: r.t0,
          t1: r.t1,
          label: r.label,
        };
        const data = getLabeledSensorData(labeled, recordings);
        if (data.length > 0) {
          all.push({ ...labeled, data });
        }
      }
    }
    return all;
  }

  // Load all labeled segments for all recordings on mount or when recordings change
  $effect(async () => {
    const segs = await loadLabeledSegments();
    labeledSegments = segs;
    labels = segs.map((s) => s.label);
  });

  async function handleTrain() {
    isTraining = true;
    await tick();
    await (async () => {
      trainLoss = [];
      // Prepare segments
      const segments = labeledSegments.map(({ label, data }) => ({
        label,
        data,
      }));
      await tick();
      const result = await trainNNClassifier(
        segments,
        { epochs, learningRate, hiddenUnits },
        segments[0].data[0].length,
      );

      nnModel = result.model;
      modelStore.set(nnModel); // Save model to store for use in test step
      trainLoss = result.loss;

      const segs = await loadLabeledSegments();
      labeledSegments = segs;
      labels = segs.map((s) => s.label);

      if (segs.length < 2) {
        mdsPoints = [];
        predictedLabels = [];
        isTraining = false;
        return;
      }

      if (segs.length >= 2) {
        const n = segs.length;
        const dist: number[][] = Array.from({ length: n }, () =>
          Array(n).fill(0),
        );
        for (let i = 0; i < n; ++i) {
          for (let j = i + 1; j < n; ++j) {
            const d = dtwDistance(segs[i].data, segs[j].data);
            dist[i][j] = dist[j][i] = d;
          }
        }
        const { mdsClassic } = await import("$lib/mds");
        ({ points: mdsPoints } = mdsClassic(dist, 2));
      }
      // Compute predicted labels for each training point
      if (nnModel && labeledSegments.length > 0) {
        predictedLabels = await Promise.all(labeledSegments.map(async (seg) =>
          await nnPredict(nnModel, seg.data, seg.data[0].length),
        ));
      } else {
        predictedLabels = [];
      }
      isTraining = false;
    })().catch((err) => {
      console.error("Error during training:", err);
      isTraining = false;
    });
  }
</script>

<div class="bg-white rounded-xl p-8 text-center">
  <h2 class="text-2xl font-bold mb-4">Neural Network Training</h2>
  <p class="text-gray-600 mb-4">
    Training a neural network can take some time, please be patient.
  </p>
  <div class="flex flex-col sm:flex-row gap-4 mb-6 justify-center items-center">
    <label class="flex flex-col items-center gap-2 w-64">
      <span class="font-medium">Hidden Units</span>
      <input
        type="range"
        min="2"
        max="24"
        step="1"
        bind:value={hiddenUnits}
        class="w-full accent-blue-600"
        aria-label="Hidden units"
      />
      <span class="text-xs text-gray-500">{hiddenUnits}</span>
    </label>
    <button
      class="rounded-xl px-4 py-2 font-semibold shadow disabled:opacity-50"
      onclick={handleTrain}
      disabled={isTraining || labeledSegments.length < 2}
    >
      {isTraining ? "Training..." : "Train Neural Network"}
    </button>
  </div>
  {#if nnModel?.weights && mdsPoints.length >= 2}
    <div class="flex flex-col items-center">
      <h3 class="text-lg font-semibold mb-2">
        MDS Plot of Neural Network Output
      </h3>
      <MdsPlot
        points={labeledSegments.map((s) => s.data)}
        labels={labeledSegments.map(
          (s, i) => `${s.label} → ${predictedLabels[i] ?? "?"}`,
        )}
        colors={{}}
        distance={dtwDistance}
        width={400}
        height={320}
        padding={32}
      />
    </div>
  {/if}
</div>
