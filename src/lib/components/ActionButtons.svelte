<script lang="ts">
    import type { Peer, DataConnection } from "peerjs";

    interface Props {
        connection: DataConnection | null;
        peer: Peer | null;
        onSendMessage: () => void;
        onDisconnect: () => void;
    }

    let { connection = $bindable(), peer = $bindable(), onSendMessage, onDisconnect }: Props = $props();
    
    let messageSent = $state(false);
    
    function handleSendMessage() {
        onSendMessage();
        messageSent = true;
        setTimeout(() => {
            messageSent = false;
        }, 1000);
    }
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <button 
        onclick={handleSendMessage}
        disabled={!connection}
        class="px-6 py-3 {messageSent ? 'bg-blue-600' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
    >
        <span>📡</span>
        <span>{messageSent ? 'Sent!' : 'Send Command'}</span>
    </button>
    
    <button 
        onclick={onDisconnect}
        disabled={!peer}
        class="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
    >
        <span>🔌</span>
        <span>Disconnect</span>
    </button>
</div>
