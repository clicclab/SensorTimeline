import { AccelerometerDataPoint, PoseDataPoint } from "../types.ts";

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
	sensorData: Array<AccelerometerDataPoint> | Array<PoseDataPoint>;
	duration: number;
};
