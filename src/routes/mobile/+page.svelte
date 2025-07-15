<script lang="ts">
    import { browser } from "$app/environment";
    import Peer, { type DataConnection } from "peerjs";
    import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
    import QRScanner from "$lib/components/QRScanner.svelte";
    import type { AccelerometerDataPoint } from "$lib/types";

    let peer: Peer | null = $state.raw(null);
    let peerId: string | null = $state(null);
    let peerStatus: string | null = $state(null);
    let connection: DataConnection | null = $state.raw(null);
    let showScanner: boolean = $state(false);
    let showQRCode: boolean = $state(false);
    let isStreaming: boolean = $state(false);
    let accelerometerData: AccelerometerDataPoint | null = $state(null);
    let streamingInterval: ReturnType<typeof setInterval> | null = null;
    let permissionGranted: boolean = $state(false);
    let deviceMotionHandler: ((event: DeviceMotionEvent) => void) | null = null;

    let otherId: string = $state('');

    // Request accelerometer permission
    async function requestAccelerometerPermission() {
        try {
            // Check if we're on iOS 13+ which requires permission
            if ('DeviceMotionEvent' in window && 'requestPermission' in DeviceMotionEvent) {
                const permission = await (DeviceMotionEvent as any).requestPermission();
                permissionGranted = permission === 'granted';
                console.log('Mobile: Accelerometer permission:', permission);
            } else {
                // Android or older iOS - no permission needed
                permissionGranted = true;
                console.log('Mobile: Accelerometer available without permission');
            }
        } catch (error) {
            console.error('Mobile: Error requesting accelerometer permission:', error);
            permissionGranted = false;
        }
    }

    // Start streaming accelerometer data
    function startStreaming() {
        if (!connection || !permissionGranted) {
            console.log('Mobile: Cannot start streaming - connection or permission missing');
            return;
        }

        console.log('Mobile: Starting accelerometer streaming...');
        isStreaming = true;

        // Create and store the event handler reference
        deviceMotionHandler = (event: DeviceMotionEvent) => {
            if (event.acceleration && connection && isStreaming) {
                const data = {
                    x: event.acceleration.x || 0,
                    y: event.acceleration.y || 0,
                    z: event.acceleration.z || 0,
                    timestamp: Date.now()
                };
                
                accelerometerData = data;
                
                // Send data to peer
                try {
                    connection.send(JSON.stringify({
                        type: 'accelerometer',
                        data: data
                    }));
                } catch (error) {
                    console.error('Mobile: Error sending accelerometer data:', error);
                }
            }
        };

        window.addEventListener('devicemotion', deviceMotionHandler);

        // Also send data at regular intervals (fallback)
        streamingInterval = setInterval(() => {
            if (accelerometerData && connection && isStreaming) {
                try {
                    connection.send(JSON.stringify({
                        type: 'heartbeat',
                        timestamp: Date.now()
                    }));
                } catch (error) {
                    console.error('Mobile: Error sending heartbeat:', error);
                }
            }
        }, 1000);
    }

    // Stop streaming accelerometer data
    function stopStreaming() {
        console.log('Mobile: Stopping accelerometer streaming...');
        isStreaming = false;
        
        // Remove the actual event listener using the stored reference
        if (deviceMotionHandler) {
            window.removeEventListener('devicemotion', deviceMotionHandler);
            deviceMotionHandler = null;
        }
        
        if (streamingInterval) {
            clearInterval(streamingInterval);
            streamingInterval = null;
        }
        
        // Clear the accelerometer data to stop any residual sending
        accelerometerData = null;
    }

    // Event handlers
    function handleConnect() {
        if (peer && otherId.trim()) {
            console.log('Mobile: Attempting to connect to:', otherId.trim());
            const conn = peer.connect(otherId.trim());
            
            // Set up event listeners for outgoing connection
            conn.on('open', () => {
                console.log('Mobile: Outgoing connection opened to:', conn.peer);
                connection = conn;
                // Auto-request permission and start streaming when connected
                if (!permissionGranted) {
                    requestAccelerometerPermission().then(() => {
                        if (permissionGranted) {
                            startStreaming();
                        }
                    });
                } else {
                    startStreaming();
                }
            });
            
            conn.on('data', (data) => {
                console.log('Mobile: Received data from outgoing connection:', data);
                // Handle incoming commands or data from desktop
            });
            
            conn.on('close', () => {
                console.log('Mobile: Outgoing connection closed');
                stopStreaming();
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

    function handleToggleStreaming() {
        if (isStreaming) {
            stopStreaming();
        } else {
            if (!permissionGranted) {
                requestAccelerometerPermission().then(() => {
                    if (permissionGranted) {
                        startStreaming();
                    }
                });
            } else {
                startStreaming();
            }
        }
    }

    function handleDisconnect() {
        console.log('Mobile: Disconnecting...');
        
        // Stop streaming first
        stopStreaming();
        
        // Close the connection
        if (connection) {
            connection.close();
            connection = null;
        }
        
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
                // Handle incoming commands from desktop
            });
            
            conn.on("open", () => {
                console.log('Mobile: Incoming connection opened with:', conn.peer);
                // Auto-request permission and start streaming when connected
                if (!permissionGranted) {
                    requestAccelerometerPermission().then(() => {
                        if (permissionGranted) {
                            startStreaming();
                        }
                    });
                } else {
                    startStreaming();
                }
            });
            
            conn.on('close', () => {
                console.log('Mobile: Incoming connection closed');
                stopStreaming();
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
    <title>Sensor Timeline - Mobile Accelerometer</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 text-white">
    <!-- Header -->
    <div class="sticky top-0 bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold">Sensor Timeline</h1>
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
            <!-- Accelerometer Streaming Interface -->
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="font-semibold">Accelerometer Stream</h2>
                    <button 
                        onclick={handleDisconnect}
                        class="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
                
                <!-- Permission Status -->
                {#if !permissionGranted}
                    <div class="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4 mb-4">
                        <div class="flex items-center space-x-2 mb-3">
                            <span class="text-yellow-400">⚠️</span>
                            <span class="font-medium">Permission Required</span>
                        </div>
                        <p class="text-sm text-yellow-100 mb-3">
                            This app needs permission to access your device's motion sensors to stream accelerometer data.
                        </p>
                        <button 
                            onclick={requestAccelerometerPermission}
                            class="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-black font-medium transition-colors"
                        >
                            Grant Permission
                        </button>
                    </div>
                {:else}
                    <!-- Streaming Status -->
                    <div class="bg-green-500/20 border border-green-400/30 rounded-lg p-4 mb-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <div class="w-3 h-3 bg-green-400 rounded-full {isStreaming ? 'animate-pulse' : ''}"></div>
                                <span class="font-medium">
                                    {isStreaming ? 'Streaming Active' : 'Ready to Stream'}
                                </span>
                            </div>
                            <button 
                                onclick={handleToggleStreaming}
                                disabled={!connection}
                                class="bg-{isStreaming ? 'red' : 'green'}-500 hover:bg-{isStreaming ? 'red' : 'green'}-600 disabled:bg-gray-500 px-3 py-1 rounded-lg text-sm transition-colors"
                            >
                                {isStreaming ? 'Stop' : 'Start'}
                            </button>
                        </div>
                    </div>
                {/if}
                
                <!-- Current Sensor Data -->
                {#if accelerometerData}
                    <div class="bg-black/20 rounded-lg p-4">
                        <h3 class="font-medium mb-3">Current Readings</h3>
                        <div class="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div class="text-sm opacity-70">X-Axis</div>
                                <div class="text-lg font-mono">
                                    {accelerometerData.x.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div class="text-sm opacity-70">Y-Axis</div>
                                <div class="text-lg font-mono">
                                    {accelerometerData.y.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div class="text-sm opacity-70">Z-Axis</div>
                                <div class="text-lg font-mono">
                                    {accelerometerData.z.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div class="text-xs opacity-50 text-center mt-2">
                            Last updated: {new Date(accelerometerData.timestamp).toLocaleTimeString()}
                            {#if isStreaming}
                                <span class="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            {/if}
                        </div>
                    </div>
                {:else if isStreaming}
                    <div class="bg-black/20 rounded-lg p-4 text-center">
                        <div class="text-4xl mb-2">📱</div>
                        <p class="text-sm opacity-70">Move your device to see sensor data</p>
                    </div>
                {:else}
                    <div class="bg-black/20 rounded-lg p-4 text-center">
                        <div class="text-4xl mb-2">📊</div>
                        <p class="text-sm opacity-70">Start streaming to see accelerometer data</p>
                    </div>
                {/if}
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
