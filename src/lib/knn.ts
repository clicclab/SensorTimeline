import { type LabeledRecording } from "./components/LabeledRecordings.ts";

export type KnnResult = {
  label: string;
  distance: number;
};

export function knnClassify(
  query: number[][],
  labeledSegments: Array<LabeledRecording & { data: number[][] }>,
  k: number,
  maxDistance: number,
  distanceFn: (a: number[][], b: number[][]) => number
): string | undefined {
  const neighbors: KnnResult[] = labeledSegments
    .map(seg => ({
      label: seg.label,
      distance: distanceFn(query, seg.data)
    }))
    .filter(n => n.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  if (neighbors.length === 0) return undefined;

  // Majority vote
  const votes: Record<string, number> = {};
  for (const n of neighbors) {
    votes[n.label] = (votes[n.label] || 0) + 1;
  }
  // Find label with most votes (break ties by closest distance)
  let bestLabel = neighbors[0].label;
  let bestCount = votes[bestLabel];
  for (const label in votes) {
    if (
      votes[label] > bestCount ||
      (votes[label] === bestCount &&
        neighbors.find(n => n.label === label)!.distance <
          neighbors.find(n => n.label === bestLabel)!.distance)
    ) {
      bestLabel = label;
      bestCount = votes[label];
    }
  }
  return bestLabel;
}

export type KnnClassifierModel = {
  k: number;
  maxDistance: number;
  distanceMetric: "dtw";
  segments: Array<{
    label: string;
    data: number[][];
  }>;
};

export function createKnnClassifierModel(
  labeledSegments: Array<{ label: string; data: number[][] }>,
  k: number,
  maxDistance: number
): KnnClassifierModel {
  return {
    k,
    maxDistance,
    distanceMetric: "dtw",
    segments: labeledSegments.map(({ label, data }) => ({ label, data }))
  };
}

export function classifyWithKnnModel(
  model: KnnClassifierModel,
  query: number[][],
  distanceFn: (a: number[][], b: number[][]) => number
): string | undefined {
  const neighbors: KnnResult[] = model.segments
    .map(seg => ({
      label: seg.label,
      distance: distanceFn(query, seg.data)
    }))
    .filter(n => n.distance <= model.maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, model.k);

  if (neighbors.length === 0) return undefined;

  const votes: Record<string, number> = {};
  for (const n of neighbors) {
    votes[n.label] = (votes[n.label] || 0) + 1;
  }
  let bestLabel = neighbors[0].label;
  let bestCount = votes[bestLabel];
  for (const label in votes) {
    if (
      votes[label] > bestCount ||
      (votes[label] === bestCount &&
        neighbors.find(n => n.label === label)!.distance <
          neighbors.find(n => n.label === bestLabel)!.distance)
    ) {
      bestLabel = label;
      bestCount = votes[label];
    }
  }
  return bestLabel;
}
