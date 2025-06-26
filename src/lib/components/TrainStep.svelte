<script lang="ts">
    import { LocalStore } from "$lib/localStore";
    import type { Recording } from "./LabeledRecordings.ts";
    import LabeledRecordingsList from "./LabeledRecordingsList.svelte";
    import ModelTypeSelector from "./ModelTypeSelector.svelte";
    import NeuralNetworkTraining from "./NeuralNetworkTraining.svelte";
    import KnnTraining from "./KnnTraining.svelte";
    import { initModelStore, modelStore } from "$lib/modelStore";
    import type { NNClassifierModel } from "$lib/nn.js";
    import type { KnnClassifierModel } from "$lib/knn.js";
    import { onMount } from "svelte";

    type TrainStepProps = {
        stepBack: () => void;
        stepForward: () => void;
    };

    let { stepBack, stepForward }: TrainStepProps = $props();

    let recordingsStore: LocalStore<any> | null = $state.raw(null);
    let recordings: Array<Recording> = $state([]);

    // On mount: initialize recordings store and load
    if (typeof window !== "undefined") {
        LocalStore.create<Array<Recording>>("saved-recordings", []).then(
            (store) => {
                recordingsStore = store;
                recordings = loadRecordings();
            },
        );
    }

    function loadRecordings(): Array<Recording> {
        if (!recordingsStore) return [];
        const raw = recordingsStore.get() || [];
        return raw.map((rec: any) => {
            if (
                rec.videoBlob &&
                typeof rec.videoBlob === "object" &&
                rec.videoBlob.base64 &&
                rec.videoBlob.type
            ) {
                return {
                    ...rec,
                };
            }
            return rec;
        });
    }

    // Add ModelType type for clarity
    export type ModelType = "neural" | "knn";
    let modelType: ModelType | null = $state(null);

    let hasModel = $state(false);

    onMount(async () => {
        // Initialize model store
        await initModelStore();
        
        const model = modelStore.get();
        hasModel = model !== null;
    });

    modelStore.subscribe(value => {
        hasModel = value !== null;
    });

</script>

<div class="bg-white rounded-xl p-2 text-center">
    <h2 class="text-2xl font-bold">Train Model</h2>
</div>

<div class="my-4">
    <h3 class="text-lg font-semibold mb-2 text-left">Your Collected Recordings</h3>
    <LabeledRecordingsList {recordings} />
</div>

<div class="my-8">
    <ModelTypeSelector onChange={(val) => modelType = val} />
</div>

{#if modelType === "neural"}
    <NeuralNetworkTraining {recordings} />
{:else if modelType === "knn"}
    <KnnTraining {recordings} />
{:else}
    <div class="bg-white rounded-xl p-8 text-center">
        <h2 class="text-2xl font-bold mb-4">Select a Model Type</h2>
        <p class="text-gray-600 mb-4">Please select a model type to proceed with training.</p>
    </div>
{/if}

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
        class="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors disabled:opacity-50"
        aria-label="Next: Test Model"
        disabled={!hasModel}
    >
        Next: Test Model &rarr;
    </button>
</div>
