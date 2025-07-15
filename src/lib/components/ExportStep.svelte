<script lang="ts">
import type { Session } from "$lib/session";
import { modelStore } from "$lib/modelStore";
import { exportNNModelToBase64 } from "$lib/nnExport";

type Props = {
    session: Session;
    stepBack: () => void;
};
let { session, stepBack }: Props = $props();


let modelJsonBase64 = $state('');
let loading = $state(false);

modelStore.subscribe(async (model) => {
    await exportModel(model);
});

async function exportModel(model: any) {
    console.log("Exporting model:", model);
    if (!model) {
        modelJsonBase64 = '';
        return;
    }
    // Detect NN model by presence of weights or modelUrl
    if ('weights' in model) {
        loading = true;
        try {
            // If weights are not loaded but modelUrl is present, load them first
            if (!model.weights && model.modelUrl) {
                const tf = await import('@tensorflow/tfjs');
                model.weights = await tf.loadLayersModel(model.modelUrl);
            }
            if (!model.weights) throw new Error('Model weights are not loaded and no modelUrl present');
            modelJsonBase64 = await exportNNModelToBase64(model);
        } catch (e) {
            console.error("Error exporting model:", e);
            modelJsonBase64 = '';
        }
        loading = false;
    } else {
        // KNN model: just JSON base64
        const json = JSON.stringify(model);
        modelJsonBase64 = typeof window !== 'undefined'
            ? window.btoa(unescape(encodeURIComponent(json)))
            : '';
    }

    console.log("Exported model JSON base64:", modelJsonBase64);
}

$effect(async () => {
    const model = modelStore.get();
    await exportModel(model);
});

let copied = $state(false);
function handleCopy() {
    if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(modelJsonBase64);
        copied = true;
        setTimeout(() => (copied = false), 1200);
    }
}
</script>

<div class="flex flex-col items-center gap-6">
    <h2 class="text-2xl font-bold text-gray-800">Export Model</h2>
    <p class="text-gray-600 text-center max-w-md">
        Copy your trained model as a base64-encoded JSON string below. Paste it into your target application or save it for later use.
    </p>
    <div class="w-full flex flex-col items-center gap-2">
        {#if loading}
            <div class="text-gray-500 text-sm">Preparing model export...</div>
        {:else}
            <textarea
                readonly
                class="w-full max-w-lg min-h-[120px] rounded-lg border border-gray-300 p-3 font-mono text-xs bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >{modelJsonBase64}</textarea>
            <button onclick={handleCopy} class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1 rounded shadow mt-1">
                {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
        {/if}
    </div>
    <button onclick={stepBack} class="mt-2 text-sm text-gray-500 hover:underline">Back to Test</button>
</div>
