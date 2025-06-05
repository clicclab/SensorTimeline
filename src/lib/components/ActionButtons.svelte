<script lang="ts">
    import type { Peer, DataConnection } from "peerjs";

    interface Props {
        connection: DataConnection | null;
        peer: Peer | null;
        onDisconnect: () => void;
    }

    let { connection = $bindable(), peer = $bindable(), onDisconnect }: Props = $props();
</script>

{#if connection && peer}
    <div class="flex justify-center">
        <button 
            onclick={onDisconnect}
            class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
        >
            <span>🔌</span>
            <span>Disconnect</span>
        </button>
    </div>
{/if}
