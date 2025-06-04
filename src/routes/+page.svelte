<script lang="ts">
    import { browser } from "$app/environment";
    import Peer, { type DataConnection } from "peerjs";
    import QRCode from "qrcode";
    import QrScanner from "qr-scanner";

    let peer: Peer | null = null;
    let peerId: string | null = $state(null);
    let peerStatus: string | null = $state(null);
    let connection: DataConnection | null = $state(null);
    let qrCodeDataUrl: string | null = $state(null);
    let showScanner: boolean = $state(false);
    let videoElement: HTMLVideoElement | null = $state(null);
    let qrScanner: QrScanner | null = null;

    let otherId: string = $state('');

    // Generate QR code when peerId changes
    async function generateQRCode(id: string) {
        try {
            const dataUrl = await QRCode.toDataURL(id, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#1f2937', // Gray-800
                    light: '#ffffff'
                }
            });
            qrCodeDataUrl = dataUrl;
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }

    // QR Scanner functions
    async function startScanner() {
        if (!browser) return;
        showScanner = true;
        
        // Wait for the DOM to update and video element to be available
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if(!videoElement) {
            console.error('Video element is not available');
            showScanner = false;
            return;
        }

        try {
            qrScanner = new QrScanner(
                videoElement,
                (result) => {
                    otherId = result.data;
                    stopScanner();
                },
                {
                    returnDetailedScanResult: true,
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                }
            );
            await qrScanner.start();
        } catch (error) {
            console.error('Error starting QR scanner:', error);
            showScanner = false;
        }
    }

    function stopScanner() {
        if (qrScanner) {
            qrScanner.stop();
            qrScanner.destroy();
            qrScanner = null;
        }
        showScanner = false;
    }

    // Initialize PeerJS
    if (browser) {
        peer = new Peer();

        peer.on('open', id => {
            console.log('Peer ID:', id);
            peerStatus = 'Connected';
            peerId = id;
            // Generate QR code when peer ID is available
            generateQRCode(id);
        });

        peer.on("connection", (conn) => {
            connection = conn;
            conn.on("data", (data) => {
                // Will print 'hi!'
                console.log(data);
            });
            conn.on("open", () => {
                conn.send("hello!");
            });
            conn.on('close', () => {
                console.log('Connection closed');
                peerStatus = 'Disconnected';
            });
            console.log('Connection established with:', conn.peer);
        });
        
        peer.on('close', () => {
            console.log('Connection closed');
            peerStatus = 'Disconnected';
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
        });
    }

</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
    <div class="max-w-2xl mx-auto">
        <div class="bg-white rounded-2xl shadow-xl p-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-8 text-center">
                <span class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    PeerJS Connection Hub
                </span>
            </h1>
            
            <!-- Status Section -->
            <div class="mb-8 p-6 bg-gray-50 rounded-xl">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Your Peer ID</label>
                                <div class="flex items-center space-x-2">
                                    <code class="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-900">
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
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Connection Status</label>
                                <div class="flex items-center space-x-2">
                                    <div class="flex items-center space-x-2">
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
                                <p class="text-green-800 text-sm">🎉 Ready to connect with other peers! Share your Peer ID or scan the QR code.</p>
                            </div>
                        {:else}
                            <div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p class="text-yellow-800 text-sm">⏳ Establishing connection to PeerJS server...</p>
                            </div>
                        {/if}
                    </div>
                    
                    <!-- QR Code Section -->
                    <div class="flex flex-col items-center justify-center">
                        <label class="block text-sm font-semibold text-gray-700 mb-2 text-center">QR Code</label>
                        <div class="bg-white p-4 rounded-xl shadow-inner border-2 border-gray-200">
                            {#if qrCodeDataUrl}
                                <img 
                                    src={qrCodeDataUrl} 
                                    alt="QR Code for Peer ID" 
                                    class="w-32 h-32 lg:w-40 lg:h-40 object-contain"
                                    style="aspect-ratio: 1/1;"
                                />
                            {:else}
                                <div class="w-32 h-32 lg:w-40 lg:h-40 bg-gray-100 rounded-lg flex items-center justify-center" style="aspect-ratio: 1/1;">
                                    <div class="text-center">
                                        <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        <span class="text-xs text-gray-600">Generating...</span>
                                    </div>
                                </div>
                            {/if}
                        </div>
                        <p class="text-xs text-gray-600 mt-2 text-center">Scan to connect</p>
                    </div>
                </div>
            </div>
            
            <!-- Connection Section -->
            <div class="space-y-6">
                <div>
                    <label for="peerId" class="block text-sm font-semibold text-gray-700 mb-2">
                        Connect to Another Peer
                    </label>
                    <div class="flex space-x-3">
                        <input 
                            id="peerId"
                            type="text" 
                            bind:value={otherId} 
                            placeholder="Enter Peer ID or scan QR code" 
                            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                        <button 
                            onclick={startScanner}
                            class="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                            title="Scan QR Code"
                        >
                            📷
                        </button>
                        <button 
                            onclick={() => connection = peer?.connect(otherId) || null}
                            disabled={!otherId || !peer}
                            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Connect
                        </button>
                    </div>
                </div>

                <!-- QR Scanner Modal -->
                {#if showScanner}
                    <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div class="bg-white rounded-2xl p-6 w-full max-w-md">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-semibold text-gray-900">Scan QR Code</h3>
                                <button 
                                    onclick={stopScanner}
                                    class="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                            <div class="relative">
                                <video 
                                    bind:this={videoElement}
                                    class="w-full h-64 bg-gray-100 rounded-lg object-cover"
                                    style="aspect-ratio: 1/1;"
                                ></video>
                                <div class="absolute inset-0 border-2 border-white rounded-lg pointer-events-none"></div>
                            </div>
                            <p class="text-sm text-gray-600 mt-3 text-center">
                                Point your camera at a QR code to scan the Peer ID
                            </p>
                            <button 
                                onclick={stopScanner}
                                class="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                {/if}
                
                <!-- Action Buttons -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                        onclick={() => connection?.send('Hello from PeerJS!')} 
                        disabled={!connection}
                        class="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                    >
                        <span>💬</span>
                        <span>Send Message</span>
                    </button>
                    
                    <button 
                        onclick={() => peer?.disconnect()} 
                        disabled={!peer}
                        class="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                    >
                        <span>🔌</span>
                        <span>Disconnect</span>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="mt-8 text-center">
            <p class="text-gray-600 text-sm">
                Built with 
                <span class="text-blue-600 font-semibold">SvelteKit</span> + 
                <span class="text-blue-600 font-semibold">PeerJS</span> + 
                <span class="text-blue-600 font-semibold">Tailwind CSS</span>
            </p>
        </div>
    </div>
</div>