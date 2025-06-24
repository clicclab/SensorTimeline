<script lang="ts">
    import { browser } from "$app/environment";
    import Peer, { type DataConnection } from "peerjs";
    import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
    import PeerStatus from "$lib/components/PeerStatus.svelte";
    import AccelerometerChart from "$lib/components/AccelerometerChart.svelte";
    import MagnitudeChart from "$lib/components/MagnitudeChart.svelte";
    import WebcamRecorder from "$lib/components/WebcamRecorder.svelte";
    import RecordingsList from "$lib/components/RecordingsList.svelte";
    import PlaybackModal from "$lib/components/PlaybackModal.svelte";
    import MicroBitController from "$lib/components/MicroBitController.svelte";
    import InputSourceSelector from "$lib/components/InputSourceSelector.svelte";
    import ConnectionSection from "$lib/components/ConnectionSection.svelte";
    import { LocalStore } from "$lib/localStore";
    import { onMount } from "svelte";
    
    let peer: Peer | null = $state.raw(null);
    let peerId: string | null = $state(null);
    let peerStatus: string | null = $state(null);
    let connection: DataConnection | null = $state.raw(null);
    let accelerometerData: {x: number, y: number, z: number, timestamp: number} | null = $state(null);
    let dataHistory: Array<{x: number, y: number, z: number, timestamp: number}> = $state([]);
    let isReceivingData: boolean = $state(false);

    // micro:bit connection state
    let isMicroBitConnected: boolean = $state(false);

    // Input source selection
    let inputSource: 'webrtc' | 'microbit' = $state('microbit');

    // Recording state
    let isRecording: boolean = $state(false);
    let recordingStartTime: number = 0;
    let recordingSensorData: Array<{x: number, y: number, z: number, timestamp: number}> = [];

    // LocalStore for recordings
    let recordingsStore: LocalStore<Array<{
        id: string;
        startTime: number;
        endTime: number;
        videoBlob: Blob;
        sensorData: Array<{x: number, y: number, z: number, timestamp: number}>;
        duration: number;
    }>> | null = $state.raw(null);

    onMount(async () => {
        // Initialize LocalStore for recordings
        recordingsStore = await LocalStore.create<Array<{
            id: string;
            startTime: number;
            endTime: number;
            videoBlob: Blob;
            sensorData: Array<{x: number, y: number, z: number, timestamp: number}>;
            duration: number;
        }>>("saved-recordings", []);

        // Load and set recordings state
        const loaded = loadRecordings();
        recordings = loaded;
        console.log('Recordings store initialized:', recordingsStore);
    });

    // Helper: Convert Blob to base64 string
    async function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Helper: Convert base64 string to Blob
    function base64ToBlob(base64: string, mimeType: string): Blob {
        const byteString = atob(base64.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeType });
    }

    // Patch: Load recordings from LocalStore and rehydrate videoBlob
    function loadRecordings(): Array<any> {
        if (!recordingsStore) {
            return [];
        }

        const raw = recordingsStore.get() || [];

        console.log(`Loaded ${raw.length} recording(s) from store:`, raw);

        return raw.map((rec: any) => {
            if (rec.videoBlob && typeof rec.videoBlob === 'object' && rec.videoBlob.base64 && rec.videoBlob.type) {
                return {
                    ...rec,
                    videoBlob: base64ToBlob(rec.videoBlob.base64, rec.videoBlob.type)
                };
            }
            return rec;
        });
    }

    let recordings: Array<{
        id: string;
        startTime: number;
        endTime: number;
        videoBlob: Blob;
        sensorData: Array<{x: number, y: number, z: number, timestamp: number}>;
        duration: number;
    }> = $state([]);

    // Save recordings to storage
    async function saveRecordings() {
        if (!recordingsStore) return;
        const toStore = await Promise.all(recordings.map(async (rec) => {
            if (rec.videoBlob instanceof Blob) {
                const base64 = await blobToBase64(rec.videoBlob);
                return { ...rec, videoBlob: { base64, type: rec.videoBlob.type } };
            }
            return rec;
        }));
        await recordingsStore.set(toStore);
    }

    let selectedRecording: any = $state(null);

    let otherId: string = $state('');

    // Event handlers
    function handleIdChange(id: string) {
        otherId = id;
    }

    function handleConnect() {
        if (peer && otherId) {
            console.log('Attempting to connect to:', otherId);
            const conn = peer.connect(otherId);
            
            conn.on('open', () => {
                console.log('Outgoing connection opened to:', conn.peer);
                console.log('Connection object:', conn);
                connection = conn;
            });
            
            conn.on('data', (data) => {
                console.log('Received data:', data);
                handleIncomingData(data);
            });
            
            conn.on('close', () => {
                console.log('Outgoing connection closed');
                connection = null;
            });
            
            conn.on('error', (err) => {
                console.error('Connection error:', err);
            });
        } else {
            console.log('Cannot connect: peer or otherId missing', { peer: !!peer, otherId });
        }
    }

    function handleIncomingData(rawData: any) {
        try {
            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            
            if (data.type === 'accelerometer' && data.data) {
                accelerometerData = data.data;
                dataHistory = [...dataHistory.slice(-99), data.data]; // Keep last 100 readings
                isReceivingData = true;
                
                // If recording, also add to recording sensor data
                if (isRecording) {
                    recordingSensorData = [...recordingSensorData, data.data];
                }
            } else if (data.type === 'heartbeat') {
                console.log('Desktop: Received heartbeat');
            }
        } catch (error) {
            console.error('Desktop: Error parsing incoming data:', error);
        }
    }

    function clearDataHistory() {
        dataHistory = [];
        accelerometerData = null;
        isReceivingData = false;
    }

    // Recording handlers
    function handleRecordingStart(startTime: number) {
        isRecording = true;
        recordingStartTime = startTime;
        recordingSensorData = [];
        console.log('Recording started at:', new Date(startTime));
    }

    function handleRecordingStop(endTime: number, videoBlob: Blob) {
        isRecording = false;
        
        const newRecording = {
            id: `recording-${Date.now()}`,
            startTime: recordingStartTime,
            endTime: endTime,
            videoBlob: videoBlob,
            sensorData: [...recordingSensorData],
            duration: endTime - recordingStartTime
        };
        
        recordings = [...recordings, newRecording];
        recordingSensorData = [];
        saveRecordings();
        console.log('Recording saved:', newRecording);
    }

    function handleDeleteRecording(id: string) {
        recordings = recordings.filter(r => r.id !== id);
        saveRecordings();
    }

    function handlePlayRecording(recording: any) {
        selectedRecording = recording;
    }

    function handleClosePlayback() {
        selectedRecording = null;
    }

    function handleSendMessage() {
        console.log('Attempting to send command, connection state:', {
            connection: !!connection,
            connectionType: connection?.type
        });
        
        if (connection) {
            try {
                connection.send(JSON.stringify({
                    type: 'command',
                    action: 'ping',
                    timestamp: Date.now()
                }));
                console.log('Command sent to mobile device');
            } catch (error) {
                console.error('Error sending command:', error);
            }
        } else {
            console.log('Cannot send command: no connection');
        }
    }

    function handleDisconnect() {
        console.log('Desktop: Disconnecting...');
        
        // Clear data
        clearDataHistory();
        
        if (connection) {
            connection.close();
            connection = null;
        }
        
        // Note: Don't disconnect the peer entirely, just close the connection
        // This allows for reconnection without reinitializing the peer
        console.log('Desktop: Disconnected, ready for new connections');
    }

    // Initialize PeerJS when WebRTC mode is selected
    $effect(() => {
        if (browser && inputSource === 'webrtc' && !peer) {
            const newPeer = new Peer();
            peer = newPeer;

            newPeer.on('open', id => {
                console.log('Peer ID:', id);
                peerStatus = 'Connected';
                peerId = id;
            });

            newPeer.on("connection", (conn) => {
                console.log('Incoming connection from:', conn.peer);
                connection = conn;
                
                conn.on("data", (data) => {
                    console.log('Received data:', data);
                    handleIncomingData(data);
                });
                
                conn.on("open", () => {
                    console.log('Incoming connection opened with:', conn.peer);
                    conn.send(JSON.stringify({
                        type: 'welcome',
                        message: 'Connected to desktop'
                    }));
                });
                
                conn.on('close', () => {
                    console.log('Incoming connection closed');
                    clearDataHistory();
                    connection = null;
                });
                
                conn.on('error', (err) => {
                    console.error('Incoming connection error:', err);
                });
            });
            
            newPeer.on('close', () => {
                console.log('Connection closed');
                peerStatus = 'Disconnected';
            });

            newPeer.on('error', (err) => {
                console.error('PeerJS error:', err);
            });
        } else if (inputSource !== 'webrtc' && peer) {
            // Clean up PeerJS when switching away from WebRTC mode
            if (connection) {
                connection.close();
                connection = null;
            }
            peer.destroy();
            peer = null;
            peerId = null;
            peerStatus = null;
        }
    });

    // Reactive statement to handle input source changes
    $effect(() => {
        // Clear data when switching input sources
        clearDataHistory();
        console.log('Input source changed to:', inputSource);
    });

    // micro:bit event handlers
    function handleMicroBitData(x: number, y: number, z: number) {
        const timestamp = Date.now();
        const newData = { x, y, z, timestamp };
        
        accelerometerData = newData;
        dataHistory = [...dataHistory.slice(-99), newData]; // Keep last 100 readings
        isReceivingData = true;
        
        // If recording, also add to recording sensor data
        if (isRecording) {
            recordingSensorData = [...recordingSensorData, newData];
        }
    }

    function handleMicroBitConnectionChange(connected: boolean) {
        isMicroBitConnected = connected;
        
        if (!connected) {
            // Clear data when micro:bit disconnects
            if (inputSource === 'microbit') {
                clearDataHistory();
            }
        }
    }

    let useMockMicroBit = $state(false);

    // Check for ?mockmicrobit=1 in the URL
    if (browser) {
        const params = new URLSearchParams(window.location.search);
        useMockMicroBit = params.get('mockmicrobit') === '1';
    }

    // Step-based workflow state

    type Step = 'collect' | 'train' | 'test';
    let step: Step = $state('collect');

    // Sync step with query param on mount
    onMount(() => {
        if (browser) {
            const params = new URLSearchParams(window.location.search);
            const urlStep = params.get('step');
            if (urlStep === 'collect' || urlStep === 'train' || urlStep === 'test') {
                step = urlStep;
            }
        }
    });

    // Update query param when step changes
    $effect(() => {
        if (browser) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('step') !== step) {
                params.set('step', step);
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.replaceState({}, '', newUrl);
            }
        }
    });
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
    <div class="max-w-2xl mx-auto">
        <div class="bg-white rounded-2xl shadow-xl p-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-8 text-center">
                <span class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Sensor Timeline - Desktop Monitor
                </span>
            </h1>

            <!-- Step Content -->
            {#if step === 'collect'}
                <!-- Input Source Selection -->
                <InputSourceSelector
                    inputSource={inputSource}
                    onChange={(val) => (inputSource = val)}
                />
                <div class="space-y-6">
                    <!-- Connection Section -->
                    {#if inputSource === 'webrtc'}
                        <div class="mb-8 p-6 bg-gray-50 rounded-xl">
                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <PeerStatus {peerId} {peerStatus} />
                                <QRCodeDisplay {peerId} />
                            </div>
                        </div>
                        <ConnectionSection
                            inputSource={inputSource}
                            otherId={otherId}
                            peer={peer}
                            connection={connection}
                            onIdChange={handleIdChange}
                            onConnect={handleConnect}
                            onDisconnect={handleDisconnect}
                            onMicroBitData={handleMicroBitData}
                            onMicroBitConnectionChange={handleMicroBitConnectionChange}
                            useMockMicroBit={useMockMicroBit}
                        />
                    {:else if inputSource === 'microbit'}
                        <MicroBitController 
                            onDataReceived={handleMicroBitData}
                            onConnectionChange={handleMicroBitConnectionChange}
                            useMock={useMockMicroBit}
                        />
                    {/if}
                    <!-- Webcam Recording Section -->
                    <WebcamRecorder 
                        onRecordingStart={handleRecordingStart}
                        onRecordingStop={handleRecordingStop}
                        allowRecording={(inputSource === 'webrtc' && !!connection) || (inputSource === 'microbit' && isMicroBitConnected)}
                    />
                    <!-- Recordings List -->
                    {#if recordings.length > 0}
                        <RecordingsList 
                            {recordings}
                            onDeleteRecording={handleDeleteRecording}
                            onPlayRecording={handlePlayRecording}
                        />
                    {/if}
                    <!-- Accelerometer Data Display -->
                    {#if (inputSource === 'webrtc' && connection) || (inputSource === 'microbit' && isMicroBitConnected)}
                        <div class="bg-gray-50 rounded-xl p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h2 class="text-xl font-semibold text-gray-900">Accelerometer Data</h2>
                                <div class="flex items-center space-x-2">
                                    <div class="w-3 h-3 bg-{isReceivingData ? 'green' : 'gray'}-400 rounded-full {isReceivingData ? 'animate-pulse' : ''}"></div>
                                    <span class="text-sm text-gray-600">
                                        {isReceivingData ? 'Receiving Data' : 'No Data'}
                                    </span>
                                    <span class="text-xs bg-gray-200 px-2 py-1 rounded">
                                        {inputSource === 'webrtc' ? 'WebRTC' : 'micro:bit'}
                                    </span>
                                </div>
                            </div>
                            {#if accelerometerData}
                                <!-- Current Readings -->
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div class="bg-white rounded-lg p-4 shadow-sm">
                                        <div class="text-sm font-medium text-gray-500 mb-1">X-Axis</div>
                                        <div class="text-2xl font-mono text-blue-600">
                                            {accelerometerData.x.toFixed(3)}
                                        </div>
                                        <div class="text-xs text-gray-400">m/s²</div>
                                    </div>
                                    <div class="bg-white rounded-lg p-4 shadow-sm">
                                        <div class="text-sm font-medium text-gray-500 mb-1">Y-Axis</div>
                                        <div class="text-2xl font-mono text-green-600">
                                            {accelerometerData.y.toFixed(3)}
                                        </div>
                                        <div class="text-xs text-gray-400">m/s²</div>
                                    </div>
                                    <div class="bg-white rounded-lg p-4 shadow-sm">
                                        <div class="text-sm font-medium text-gray-500 mb-1">Z-Axis</div>
                                        <div class="text-2xl font-mono text-purple-600">
                                            {accelerometerData.z.toFixed(3)}
                                        </div>
                                        <div class="text-xs text-gray-400">m/s²</div>
                                    </div>
                                </div>
                                <!-- Data History Stats -->
                                <div class="bg-white rounded-lg p-4 shadow-sm">
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="font-medium text-gray-900">Data Stream</h3>
                                        <button 
                                            onclick={clearDataHistory}
                                            class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                                        >
                                            Clear History
                                        </button>
                                    </div>
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div class="text-gray-500">Total Readings</div>
                                            <div class="font-mono">{dataHistory.length}</div>
                                        </div>
                                        <div>
                                            <div class="text-gray-500">Last Update</div>
                                            <div class="font-mono">
                                                {new Date(accelerometerData.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div class="text-gray-500">Magnitude</div>
                                            <div class="font-mono">
                                                {Math.sqrt(accelerometerData.x**2 + accelerometerData.y**2 + accelerometerData.z**2).toFixed(3)}
                                            </div>
                                        </div>
                                        <div>
                                            <div class="text-gray-500">Status</div>
                                            <div class="text-green-600 font-medium">Active</div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Real-time Charts -->
                                <div class="space-y-4">
                                    <!-- Main 3-axis chart -->
                                    <AccelerometerChart data={dataHistory} maxDataPoints={50} />
                                    <!-- Magnitude chart -->
                                    <MagnitudeChart data={dataHistory} maxDataPoints={50} />
                                </div>
                            {:else}
                                <div class="bg-white rounded-lg p-8 shadow-sm text-center">
                                    <div class="text-4xl mb-4">
                                        {inputSource === 'webrtc' ? '📱' : '🔬'}
                                    </div>
                                    <h3 class="text-lg font-medium text-gray-900 mb-2">
                                        Waiting for {inputSource === 'webrtc' ? 'Mobile Device' : 'micro:bit'}
                                    </h3>
                                    <p class="text-gray-600">
                                        {inputSource === 'webrtc' 
                                            ? 'Connect a mobile device to start receiving accelerometer data'
                                            : 'Connect your micro:bit to start receiving accelerometer data'
                                        }
                                    </p>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
                <div class="flex justify-end mt-8">
                    <button
                        onclick={() => (step = 'train')}
                        class="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                        aria-label="Next: Train Model"
                    >
                        Next: Train Model &rarr;
                    </button>
                </div>
            {:else if step === 'train'}
                <div class="bg-white rounded-xl p-8 text-center">
                    <h2 class="text-2xl font-bold mb-4">Train Model</h2>
                    <p class="text-gray-600 mb-4">This step will allow you to train a model using your collected recordings. (Coming soon!)</p>
                    <!-- Placeholder for model training UI -->
                </div>
                <div class="flex justify-between mt-8">
                    <button
                        onclick={() => (step = 'collect')}
                        class="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                        aria-label="Back: Collect Data"
                    >
                        &larr; Back: Collect Data
                    </button>
                    <button
                        onclick={() => (step = 'test')}
                        class="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                        aria-label="Next: Test Model"
                    >
                        Next: Test Model &rarr;
                    </button>
                </div>
            {:else if step === 'test'}
                <div class="bg-white rounded-xl p-8 text-center">
                    <h2 class="text-2xl font-bold mb-4">Test Model</h2>
                    <p class="text-gray-600 mb-4">This step will allow you to test your trained model on new data. (Coming soon!)</p>
                    <!-- Placeholder for model testing UI -->
                </div>
                <div class="flex justify-start mt-8">
                    <button
                        onclick={() => (step = 'train')}
                        class="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                        aria-label="Back: Train Model"
                    >
                        &larr; Back: Train Model
                    </button>
                </div>
            {/if}
        </div>
        <!-- Footer -->
        <div class="mt-8 text-center">
            <p class="text-gray-600 text-sm">
                Real-time sensor data streaming with 
                <span class="text-blue-600 font-semibold">SvelteKit</span> + 
                <span class="text-blue-600 font-semibold">PeerJS</span> + 
                <span class="text-blue-600 font-semibold">Device Motion API</span> + 
                <span class="text-purple-600 font-semibold">micro:bit Bluetooth</span>
            </p>
        </div>
    </div>
    <!-- Playback Modal -->
    <PlaybackModal 
        recording={selectedRecording}
        onClose={handleClosePlayback}
    />
</div>
