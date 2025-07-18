import { type Vector3 } from "./types.ts";

export type Point =
    | 'nose'
    | 'leftEyeInner'
    | 'leftEye'
    | 'leftEyeOuter'
    | 'rightEyeInner'
    | 'rightEye'
    | 'rightEyeOuter'
    | 'leftEar'
    | 'rightEar'
    | 'mouthLeft'
    | 'mouthRight'
    | 'leftShoulder'
    | 'rightShoulder'
    | 'leftElbow'
    | 'rightElbow'
    | 'leftWrist'
    | 'rightWrist'
    | 'leftPinky'
    | 'rightPinky'
    | 'leftIndex'
    | 'rightIndex'
    | 'leftThumb'
    | 'rightThumb'
    | 'leftHip'
    | 'rightHip'
    | 'leftKnee'
    | 'rightKnee'
    | 'leftAnkle'
    | 'rightAnkle'
    | 'leftHeel'
    | 'rightHeel'
    | 'leftFootIndex'
    | 'rightFootIndex';

export const allPoints: Point[] = [
    'nose',
    'leftEyeInner',
    'leftEye',
    'leftEyeOuter',
    'rightEyeInner',
    'rightEye',
    'rightEyeOuter',
    'leftEar',
    'rightEar',
    'mouthLeft',
    'mouthRight',
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
    'leftWrist',
    'rightWrist',
    'leftPinky',
    'rightPinky',
    'leftIndex',
    'rightIndex',
    'leftThumb',
    'rightThumb',
    'leftHip',
    'rightHip',
    'leftKnee',
    'rightKnee',
    'leftAnkle',
    'rightAnkle',
    'leftHeel',
    'rightHeel',
    'leftFootIndex',
    'rightFootIndex'
];

export const landmarkMap: Record<Point, number> = {
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  leftEyeOuter: 3,
  rightEyeInner: 4,
  rightEye: 5,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32
};

export const useLandmarks: Point[] = [
    'nose',
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
    'leftWrist',
    'rightWrist',
    'leftHip',
    'rightHip',
    'leftAnkle',
    'rightAnkle',
]

export const filterToUsedLandmarks = (landmarks: Vector3[]): Vector3[] => {
    return landmarks.filter((_, i) => useLandmarks.includes(allPoints[i]));
};
