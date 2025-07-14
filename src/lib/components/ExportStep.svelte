<script lang="ts">
import type { Session } from "$lib/session";
type Props = {
    session: Session;
    stepBack: () => void;
};
let { session, stepBack }: Props = $props();

function handleExport() {
    // TODO: Implement model export logic
}
</script>

<div class="flex flex-col items-center gap-6">
    <h2 class="text-2xl font-bold text-gray-800">Export Model</h2>
    <p class="text-gray-600 text-center max-w-md">
        Export your trained model for use elsewhere. Download the model file or copy the configuration below.
    </p>
    <button onclick={handleExport} class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow">
        Download Model
    </button>
    <button onclick={stepBack} class="mt-2 text-sm text-gray-500 hover:underline">Back to Test</button>
</div>
