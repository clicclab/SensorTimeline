<script lang="ts">
    import { modelStore } from "$lib/modelStore";
    import { get } from "svelte/store";
    import { type NNClassifierModel } from "$lib/nn";
    import { type KnnClassifierModel } from "$lib/knn";


    type TestStepProps = {
        stepBack: () => void;
    };
    let { stepBack }: TestStepProps = $props();

    let model = get(modelStore);

    $inspect(model);

</script>

<div class="bg-white rounded-xl p-8 text-center">
    <h2 class="text-2xl font-bold mb-4">Test Model</h2>
    {#if model}
        <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2">Model Info</h3>
            {#if 'outputLabels' in model}
                <div class="mb-2">Type: Neural Network</div>
                <div>Labels: {model.outputLabels.join(", ")}</div>
            {:else if 'labels' in model}
                <div class="mb-2">Type: KNN</div>
                <div>Labels: {model.labels.join(", ")}</div>
            {:else}
                <div>Unknown model type</div>
            {/if}
        </div>
    {:else}
        <p class="text-gray-600 mb-4">No trained model found. Please train a model first.</p>
    {/if}
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
