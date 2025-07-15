<script lang="ts">
import type { Session } from "$lib/session";

type Props = {
    session: Session;
    onReset?: () => void;
};
let { session, onReset }: Props = $props();
</script>

<div class="flex justify-between items-center mb-6">
    <div>
        <span class="text-sm text-gray-500">Session:</span>
        <span class="ml-2 px-2 py-1 rounded bg-gray-100 text-gray-700 font-mono">{session.id}</span>
        <span class="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold">{session.type}</span>
    </div>
    {#if onReset}
        <button onclick={onReset} class="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Change Session</button>
    {/if}
</div>
