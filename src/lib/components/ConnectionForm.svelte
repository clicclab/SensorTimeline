<script lang="ts">
    import type { Peer, DataConnection } from "peerjs";

    interface Props {
        otherId: string;
        peer: Peer | null;
        connection: DataConnection | null;
        onIdChange: (id: string) => void;
        onConnect: () => void;
        onScanRequest: () => void;
    }

    let { otherId, peer, connection, onIdChange, onConnect, onScanRequest }: Props = $props();
</script>

<div>
    <label for="peerId" class="block text-sm font-semibold text-gray-700 mb-2">
        Connect to Another Peer
    </label>
    <div class="flex space-x-3">
        <input 
            id="peerId"
            type="text" 
            bind:value={otherId}
            oninput={(e) => onIdChange((e.target as HTMLInputElement)?.value)}
            placeholder="Enter Peer ID or scan QR code" 
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        <button 
            onclick={onScanRequest}
            class="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            title="Scan QR Code"
        >
            📷
        </button>
    </div>
    <div class="mt-2">
        <button 
            onclick={onConnect}
            disabled={(connection != null) || !otherId || !peer}
            class="px-6 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
            Connect
        </button>
    </div>
</div>
