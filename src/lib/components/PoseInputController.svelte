<script lang="ts">
    import { onMount } from "svelte";

type Point = 'nose' | 'leftEye' | 'rightEye' | 'leftWrist' | 'rightWrist' | 'leftAnkle' | 'rightAnkle';

type Props = {
    selectedPoints?: Point[];
    onPointsChange?: (points: Point[]) => void;
};

export const allPoints: Point[] = [
    'nose',
    'leftEye',
    'rightEye',
    'leftWrist',
    'rightWrist',
    'leftAnkle',
    'rightAnkle'
];

let { selectedPoints = [...allPoints], onPointsChange }: Props = $props();

function togglePoint(point: Point) {
    let updated: Point[];
    if (selectedPoints.includes(point)) {
        updated = selectedPoints.filter(p => p !== point);
    } else {
        updated = [...selectedPoints, point];
    }
    if (onPointsChange) onPointsChange(updated);
    selectedPoints = updated;
}

onMount(() => {
    // Ensure selectedPoints is always a valid subset of allPoints
    selectedPoints = selectedPoints.filter(p => allPoints.includes(p));
    onPointsChange?.(selectedPoints);
});
</script>

<div class="bg-white rounded-xl p-8 shadow-sm border border-gray-200 flex flex-col items-center text-center">
    <span class="w-14 h-14 bg-gradient-to-r from-green-500 to-lime-400 rounded-lg flex items-center justify-center mb-4">
        <span class="text-white text-3xl font-bold">🧍</span>
    </span>
    <h2 class="text-2xl font-semibold text-gray-900 mb-2">Pose Input Active</h2>
    <!-- <p class="text-gray-600 mb-4 max-w-md">
        Use your webcam to detect and record movement data for training and testing models. Select which keypoints to track below.
    </p>
    <div class="flex flex-wrap gap-2 justify-center mb-2">
        {#each allPoints as point}
            <label class="flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-green-400
                {selectedPoints.includes(point) ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}">
                <input
                    type="checkbox"
                    checked={selectedPoints.includes(point)}
                    onchange={() => togglePoint(point)}
                    class="accent-green-500 focus:ring-0 focus:outline-none"
                    aria-checked={selectedPoints.includes(point)}
                />
                <span>{point}</span>
            </label>
        {/each}
    </div> -->
</div>
