<script lang="ts">
    interface Props {
        peerId: string | null;
        peerStatus: string | null;
    }

    let { peerId, peerStatus }: Props = $props();
</script>

<div class="lg:col-span-2">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2" for="peerIdDisplay">Your Peer ID</label>
            <div class="flex items-center space-x-2">
                <code class="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-900" id="peerIdDisplay">
                    {peerId || 'Generating...'}
                </code>
                {#if peerId}
                    <button 
                        onclick={() => navigator.clipboard.writeText(peerId)}
                        class="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors duration-200"
                        title="Copy Peer ID"
                    >
                        📋
                    </button>
                {/if}
            </div>
        </div>
        
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2" for="connectionStatus">Connection Status</label>
            <div class="flex items-center space-x-2">
                <div class="flex items-center space-x-2" id="connectionStatus">
                    {#if peerStatus === 'Connected'}
                        <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span class="text-green-700 font-medium">Connected</span>
                    {:else}
                        <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span class="text-yellow-700 font-medium">Connecting...</span>
                    {/if}
                </div>
            </div>
        </div>
    </div>
    
    {#if peerStatus === 'Connected'}
        <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-green-800 text-sm">🎉 Ready to connect to mobile! Share your Peer ID or scan the QR code.

                <br />
                <span class="font-semibold">Tip:</span> Go to <a href="{window.location.origin}/mobile" class="text-blue-600 hover:underline">/mobile</a> on your mobile device to connect.
            </p>
        </div>
    {:else}
        <div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-yellow-800 text-sm">⏳ Establishing connection to PeerJS server...</p>
        </div>
    {/if}
</div>
