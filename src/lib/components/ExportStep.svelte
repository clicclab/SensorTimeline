<script lang="ts">
import type { Session } from "$lib/session";
import { modelStore } from "$lib/modelStore";
type Props = {
    session: Session;
    stepBack: () => void;
};
let { session, stepBack }: Props = $props();

let modelJsonBase64 = $derived.by(() => {
    const model = modelStore.get();
    if (!model) return '';
    const json = JSON.stringify(model);
    return typeof window !== 'undefined'
        ? window.btoa(unescape(encodeURIComponent(json)))
        : '';
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
        <textarea
            readonly
            class="w-full max-w-lg min-h-[120px] rounded-lg border border-gray-300 p-3 font-mono text-xs bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >{modelJsonBase64}</textarea>
        <button onclick={handleCopy} class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1 rounded shadow mt-1">
            {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
    </div>
    <button onclick={stepBack} class="mt-2 text-sm text-gray-500 hover:underline">Back to Test</button>
</div>
