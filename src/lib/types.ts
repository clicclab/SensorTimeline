// Shared type for model selection
export type ModelType = "neural" | "knn";

export type AccelerometerDataPoint = {
  x: number;
  y: number;
  z: number;
  timestamp: number;
};
