import { type LabeledRecording } from "./components/LabeledRecordings.ts";

export type KnnResult = {
  label: string;
  distance: number;
};

export function euclideanDistance(a: number[][], b: number[][]): number {
  if (a.length !== b.length) {
    throw new Error("Segments must have the same length for Euclidean distance");
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) {
      throw new Error("Segments must have the same number of dimensions for Euclidean distance");
    }
    for (let j = 0; j < a[i].length; j++) {
      sum += Math.pow(a[i][j] - b[i][j], 2);
    }
  }
  return Math.sqrt(sum);
}

export function knnModelClassify(
  model: KnnClassifierModel,
  query: number[][],
  distanceFn: (a: number[][], b: number[][]) => number
): string | undefined {
  // Use knnClassify with the model's segments
  return knnClassify(query, model.segments, model.k, model.maxDistance, distanceFn);
}

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
