<script lang="ts">
export type TrainStepProps = {
    stepBack: () => void;
    stepForward: () => void;
};
let { stepBack, stepForward } = $props<TrainStepProps>();
</script>

<div class="bg-white rounded-xl p-8 text-center">
    <h2 class="text-2xl font-bold mb-4">Train Model</h2>
    <p class="text-gray-600 mb-4">This step will allow you to train a model using your collected recordings. (Coming soon!)</p>
    <!-- Placeholder for model training UI -->
</div>
<div class="flex justify-between mt-8">
    <button
        onclick={stepBack}
        class="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        aria-label="Back: Collect Data"
    >
        &larr; Back: Collect Data
    </button>
    <button
        onclick={stepForward}
        class="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        aria-label="Next: Test Model"
    >
        Next: Test Model &rarr;
    </button>
</div>
