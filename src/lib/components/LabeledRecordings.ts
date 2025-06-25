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
	sensorData: Array<{ x: number; y: number; z: number; timestamp: number }>;
	duration: number;
};
