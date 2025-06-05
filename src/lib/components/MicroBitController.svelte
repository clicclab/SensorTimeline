<script lang="ts">
    import { browser } from "$app/environment";
    import { connect, disconnect, isConnected, getDeviceName, setAccelerometerDataCallback, setDisconnectedCallback, setConnectedCallback } from "$lib/microBit";

    interface Props {
        onDataReceived: (x: number, y: number, z: number) => void;
        onConnectionChange: (connected: boolean) => void;
    }

    let { onDataReceived, onConnectionChange }: Props = $props();

    let isDeviceConnected: boolean = $state(false);
    let deviceName: string | null = $state(null);
    let isConnecting: boolean = $state(false);
    let error: string | null = $state(null);

    // Check if Web Bluetooth is supported
    let isBluetoothSupported: boolean = $state(false);

    if (browser) {
        isBluetoothSupported = 'bluetooth' in navigator;
        
        // Set up callbacks for micro:bit events
        setAccelerometerDataCallback((x: number, y: number, z: number) => {
            // Convert from micro:bit units (milli-g) to m/s²
            // micro:bit reports in milli-g, so divide by 1000 to get g, then multiply by 9.81 for m/s²
            const xMs2 = (x / 1000) * 9.81;
            const yMs2 = (y / 1000) * 9.81;
            const zMs2 = (z / 1000) * 9.81;
            
            onDataReceived(xMs2, yMs2, zMs2);
        });

        setDisconnectedCallback(() => {
            isDeviceConnected = false;
            deviceName = null;
            onConnectionChange(false);
            error = "Device disconnected";
        });

        setConnectedCallback(() => {
            isDeviceConnected = true;
            deviceName = getDeviceName();
            onConnectionChange(true);
            error = null;
            isConnecting = false;
        });
    }

    async function handleConnect() {
        if (!browser || !isBluetoothSupported) {
            error = "Web Bluetooth not supported in this browser";
            return;
        }

        isConnecting = true;
        error = null;

        try {
            await connect();
            // Connection success is handled by the setConnectedCallback
        } catch (err) {
            console.error("Failed to connect to micro:bit:", err);
            error = err instanceof Error ? err.message : "Failed to connect to micro:bit";
            isDeviceConnected = false;
            deviceName = null;
            onConnectionChange(false);
            isConnecting = false;
        }
    }

    function handleDisconnect() {
        try {
            disconnect();
            isDeviceConnected = false;
            deviceName = null;
            onConnectionChange(false);
            error = null;
        } catch (err) {
            console.error("Failed to disconnect:", err);
            error = "Failed to disconnect properly";
        }
    }

    function clearError() {
        error = null;
    }
</script>

<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
    <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span class="text-white text-sm font-bold">μ</span>
            </div>
            <div>
                <h3 class="text-lg font-semibold text-gray-900">micro:bit Connection</h3>
                <p class="text-sm text-gray-600">Connect via Bluetooth Low Energy</p>
            </div>
        </div>
        <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-{isDeviceConnected ? 'green' : 'gray'}-400 rounded-full {isDeviceConnected ? 'animate-pulse' : ''}"></div>
            <span class="text-sm text-gray-600">
                {isDeviceConnected ? 'Connected' : 'Disconnected'}
            </span>
        </div>
    </div>

    {#if !isBluetoothSupported}
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
                <span class="text-yellow-600 text-xl">⚠️</span>
                <div>
                    <h4 class="text-yellow-800 font-medium">Web Bluetooth Not Supported</h4>
                    <p class="text-yellow-700 text-sm mt-1">
                        Your browser doesn't support Web Bluetooth. Try using Chrome or Edge on desktop.
                    </p>
                </div>
            </div>
        </div>
    {:else if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div class="flex items-start justify-between">
                <div class="flex items-start space-x-3">
                    <span class="text-red-600 text-xl">❌</span>
                    <div>
                        <h4 class="text-red-800 font-medium">Connection Error</h4>
                        <p class="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                </div>
                <button 
                    onclick={clearError}
                    class="text-red-600 hover:text-red-800 text-sm"
                >
                    ✕
                </button>
            </div>
        </div>
    {/if}

    <div class="space-y-4">
        {#if isDeviceConnected && deviceName}
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-center space-x-3">
                    <span class="text-green-600 text-xl">✅</span>
                    <div>
                        <h4 class="text-green-800 font-medium">Connected to {deviceName}</h4>
                        <p class="text-green-700 text-sm">Receiving accelerometer data</p>
                    </div>
                </div>
            </div>
            
            <button 
                onclick={handleDisconnect}
                class="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
                <span>🔌</span>
                <span>Disconnect micro:bit</span>
            </button>
        {:else}
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-start space-x-3">
                    <span class="text-blue-600 text-xl">ℹ️</span>
                    <div>
                        <h4 class="text-blue-800 font-medium">Connection Instructions</h4>
                        <ul class="text-blue-700 text-sm mt-2 space-y-1">
                            <li>• Make sure your micro:bit is powered on</li>
                            <li>• Ensure it's running the Bluetooth accelerometer service</li>
                            <li>• Click connect and select your micro:bit from the list</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <button 
                onclick={handleConnect}
                disabled={isConnecting || !isBluetoothSupported}
                class="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
                {#if isConnecting}
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Connecting...</span>
                {:else}
                    <span>📡</span>
                    <span>Connect micro:bit</span>
                {/if}
            </button>
        {/if}
    </div>
</div>
