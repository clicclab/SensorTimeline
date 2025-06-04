<script lang="ts">
    import { browser } from "$app/environment";
    import Peer, { type DataConnection } from "peerjs";
    import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
    import QRScanner from "$lib/components/QRScanner.svelte";

    let peer: Peer | null = $state.raw(null);
    let peerId: string | null = $state(null);
    let peerStatus: string | null = $state(null);
    let connection: DataConnection | null = $state.raw(null);
    let showScanner: boolean = $state(false);
    let showQRCode: boolean = $state(false);
    let messages: Array<{text: string, timestamp: Date, sender: 'me' | 'peer'}> = $state([]);

    let otherId: string = $state('');
    let messageInput: string = $state('');

    // Debug effect to track connection state
    $effect(() => {
        console.log('Mobile: Connection state changed:', {
            connection: !!connection,
            peerId,
            peerStatus,
            messagesCount: messages.length
        });
    });

    // Event handlers
    function handleConnect() {
        if (peer && otherId.trim()) {
            console.log('Mobile: Attempting to connect to:', otherId.trim());
            const conn = peer.connect(otherId.trim());
            
            // Set up event listeners for outgoing connection
            conn.on('open', () => {
                console.log('Mobile: Outgoing connection opened to:', conn.peer);
                connection = conn;
            });
            
            conn.on('data', (data) => {
                console.log('Mobile: Received data from outgoing connection:', data);
                const message = {
                    text: data as string,
                    timestamp: new Date(),
                    sender: 'peer' as const
                };
                messages = [...messages, message];
            });
            
            conn.on('close', () => {
                console.log('Mobile: Outgoing connection closed');
                connection = null;
            });
            
            conn.on('error', (err) => {
                console.error('Mobile: Outgoing connection error:', err);
            });
            
            otherId = '';
        }
    }

    function handleScanRequest() {
        showScanner = true;
    }

    function handleScanResult(result: string) {
        otherId = result;
        showScanner = false;
    }

    function handleScanClose() {
        showScanner = false;
    }

    function handleSendMessage() {
        if (connection && messageInput.trim()) {
            const message = {
                text: messageInput.trim(),
                timestamp: new Date(),
                sender: 'me' as const
            };
            
            try {
                connection.send(message.text);
                messages = [...messages, message];
                messageInput = '';
                console.log('Mobile: Message sent:', message.text);
            } catch (error) {
                console.error('Mobile: Error sending message:', error);
            }
        } else {
            console.log('Mobile: Cannot send message - connection or input missing', {
                connection: !!connection,
                messageInput: messageInput.trim()
            });
        }
    }

    function handleDisconnect() {
        console.log('Mobile: Disconnecting...');
        
        // Close the connection first
        if (connection) {
            connection.close();
            connection = null;
        }
        
        // Clear messages
        messages = [];
        
        // Note: Don't disconnect the peer entirely, just close the connection
        // This allows for reconnection without reinitializing the peer
        console.log('Mobile: Disconnected, ready for new connections');
    }

    function toggleQRCode() {
        showQRCode = !showQRCode;
    }

    // Initialize PeerJS
    if (browser) {
        const newPeer = new Peer();
        peer = newPeer;

        newPeer.on('open', id => {
            console.log('Mobile: Peer ID:', id);
            peerStatus = 'Connected';
            peerId = id;
        });

        newPeer.on("connection", (conn) => {
            console.log('Mobile: Incoming connection from:', conn.peer);
            connection = conn;
            
            conn.on("data", (data) => {
                console.log('Mobile: Received data from incoming connection:', data);
                const message = {
                    text: data as string,
                    timestamp: new Date(),
                    sender: 'peer' as const
                };
                messages = [...messages, message];
            });
            
            conn.on("open", () => {
                console.log('Mobile: Incoming connection opened with:', conn.peer);
            });
            
            conn.on('close', () => {
                console.log('Mobile: Incoming connection closed');
                connection = null;
            });
            
            conn.on('error', (err) => {
                console.error('Mobile: Incoming connection error:', err);
            });
        });
        
        newPeer.on('close', () => {
            console.log('Mobile: Peer closed');
            peerStatus = 'Disconnected';
        });

        newPeer.on('error', (err) => {
            console.error('Mobile: PeerJS error:', err);
        });
    }
</script>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>PeerJS Mobile - Connection Hub</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white">
    <!-- Header -->
    <div class="sticky top-0 bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold">PeerJS Mobile</h1>
            <div class="flex items-center space-x-2">
                {#if peerStatus === 'Connected'}
                    <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span class="text-sm">Online</span>
                {:else}
                    <div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span class="text-sm">Connecting...</span>
                {/if}
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="p-4 space-y-4">
        <!-- Your ID Section -->
        {#if peerId}
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div class="flex items-center justify-between mb-3">
                    <h2 class="font-semibold">Your ID</h2>
                    <button 
                        onclick={toggleQRCode}
                        class="text-2xl"
                        title="Toggle QR Code"
                    >
                        {showQRCode ? '📱' : '📊'}
                    </button>
                </div>
                
                {#if showQRCode}
                    <div class="flex justify-center mb-4">
                        <div class="bg-white p-3 rounded-xl">
                            <QRCodeDisplay {peerId} />
                        </div>
                    </div>
                {:else}
                    <div class="flex items-center space-x-2">
                        <code class="flex-1 bg-black/20 px-3 py-2 rounded-lg text-sm font-mono break-all">
                            {peerId}
                        </code>
                        <button 
                            onclick={() => {if(peerId) navigator.clipboard.writeText(peerId);}}
                            class="bg-blue-500 hover:bg-blue-600 p-2 rounded-lg transition-colors"
                            title="Copy ID"
                        >
                            📋
                        </button>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Connection Section -->
        {#if !connection}
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <h2 class="font-semibold mb-3">Connect to Peer</h2>
                
                <div class="space-y-3">
                    <div class="flex space-x-2">
                        <input 
                            type="text" 
                            bind:value={otherId}
                            placeholder="Paste or enter Peer ID" 
                            class="flex-1 bg-black/20 border border-white/30 rounded-lg px-3 py-3 text-white placeholder-white/70 focus:border-white focus:outline-none"
                        />
                        <button 
                            onclick={handleScanRequest}
                            class="bg-purple-500 hover:bg-purple-600 p-3 rounded-lg transition-colors text-xl"
                            title="Scan QR Code"
                        >
                            📷
                        </button>
                    </div>
                    
                    <button 
                        onclick={handleConnect}
                        disabled={!otherId.trim() || !peer}
                        class="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
                    >
                        Connect
                    </button>
                </div>
            </div>
        {:else}
            <!-- Chat Interface -->
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-4 h-96 flex flex-col">
                <div class="flex items-center justify-between mb-3">
                    <h2 class="font-semibold">Chat</h2>
                    <button 
                        onclick={handleDisconnect}
                        class="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
                
                <!-- Messages -->
                <div class="flex-1 overflow-y-auto space-y-2 mb-3">
                    {#each messages as message}
                        <div class="flex {message.sender === 'me' ? 'justify-end' : 'justify-start'}">
                            <div class="max-w-xs bg-{message.sender === 'me' ? 'blue' : 'gray'}-500 rounded-2xl px-3 py-2">
                                <p class="text-sm">{message.text}</p>
                                <p class="text-xs opacity-70 mt-1">
                                    {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                    {:else}
                        <div class="text-center text-white/70 py-8">
                            <p>No messages yet</p>
                            <p class="text-sm">Start the conversation! 👋</p>
                        </div>
                    {/each}
                </div>
                
                <!-- Message Input -->
                <div class="flex space-x-2">
                    <input 
                        type="text" 
                        bind:value={messageInput}
                        placeholder="Type a message..." 
                        class="flex-1 bg-black/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-white/70 focus:border-white focus:outline-none"
                        onkeydown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                        onclick={handleSendMessage}
                        disabled={!messageInput.trim() || !connection}
                        class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 px-4 py-2 rounded-lg transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        {/if}
    </div>

    <!-- QR Scanner Modal -->
    <QRScanner 
        isOpen={showScanner}
        onScan={handleScanResult}
        onClose={handleScanClose}
    />
</div>

<style>
    /* Ensure full height on mobile */
    :global(html, body) {
        height: 100%;
        overflow-x: hidden;
    }
    
    /* Custom scrollbar for webkit browsers */
    :global(.overflow-y-auto::-webkit-scrollbar) {
        width: 4px;
    }
    
    :global(.overflow-y-auto::-webkit-scrollbar-track) {
        background: transparent;
    }
    
    :global(.overflow-y-auto::-webkit-scrollbar-thumb) {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
    }
</style>
