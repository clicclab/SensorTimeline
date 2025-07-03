// Shared type for model selection
export type ModelType = "neural" | "knn";

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type AccelerometerDataPoint = Vector3 & {
  timestamp: number;
};

export type PoseDataPoint = {
    landmarks: Vector3[];
    timestamp: number;
};

export type LabeledRecording = {
	recordingStartTime: number;
	t0: number;
	t1: number;
	label: string;
};

export type Recording = {
	id: string;
	startTime: number;
	endTime: number;
	videoBlob: Blob;
	sensorData: Array<AccelerometerDataPoint>;
	duration: number;
};