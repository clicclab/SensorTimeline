<script lang="ts">
export type TestStepProps = {
    stepBack: () => void;
};
let { stepBack } = $props<TestStepProps>();
</script>

<div class="bg-white rounded-xl p-8 text-center">
    <h2 class="text-2xl font-bold mb-4">Test Model</h2>
    <p class="text-gray-600 mb-4">This step will allow you to test your trained model on new data. (Coming soon!)</p>
    <!-- Placeholder for model testing UI -->
</div>
<div class="flex justify-start mt-8">
    <button
        onclick={stepBack}
        class="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        aria-label="Back: Train Model"
    >
        &larr; Back: Train Model
    </button>
</div>
