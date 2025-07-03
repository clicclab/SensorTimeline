<script lang="ts">
import Peer, { type DataConnection } from "peerjs";
import { browser } from "$app/environment";
import { LocalStore } from "$lib/localStore";
import InputSourceSelector from "$lib/components/InputSourceSelector.svelte";
import ConnectionSection from "$lib/components/ConnectionSection.svelte";
import MicroBitController from "$lib/components/MicroBitController.svelte";
import WebcamRecorder from "$lib/components/WebcamRecorder.svelte";
import RecordingsList from "$lib/components/RecordingsList.svelte";
import PeerStatus from "$lib/components/PeerStatus.svelte";
import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
import AccelerometerChart from "$lib/components/AccelerometerChart.svelte";
import MagnitudeChart from "$lib/components/MagnitudeChart.svelte";
import PlaybackModal from "$lib/components/PlaybackModal.svelte";
import PoseInputController from "$lib/components/PoseInputController.svelte";
import { base64ToBlob, blobToBase64 } from "$lib/blobUtils";

// Props
 type Props = {
    stepForward: () => void;
};
let { stepForward }: Props = $props();

// PeerJS state
let peer: Peer | null = $state.raw(null);
let peerId: string | null = $state(null);
let peerStatus: string | null = $state(null);
let connection: DataConnection | null = $state.raw(null);
let otherId: string = $state('');

// Accelerometer state
let accelerometerData: {x: number, y: number, z: number, timestamp: number} | null = $state(null);
let dataHistory: Array<{x: number, y: number, z: number, timestamp: number}> = $state([]);
let isReceivingData: boolean = $state(false);

// micro:bit state
let isMicroBitConnected: boolean = $state(false);
let useMockMicroBit = $state(false);

// Input source
let inputSource: 'webrtc' | 'microbit' | 'pose' | null = $state(null);

// Recording state
let isRecording: boolean = $state(false);
let recordingStartTime: number = 0;
let recordingSensorData: Array<{x: number, y: number, z: number, timestamp: number}> = [];

// Recordings store
let recordingsStore: LocalStore<any> | null = $state.raw(null);
let recordings: Array<{
    id: string;
    startTime: number;
    endTime: number;
    videoBlob: Blob;
    sensorData: Array<{x: number, y: number, z: number, timestamp: number}>;
    duration: number;
}> = $state([]);

// Playback modal state
let selectedRecording: any = $state(null);
let savedSelections: Array<{t0: number, t1: number, label: string}> = $state([]);

// On mount: initialize recordings store and load
if (browser) {
    LocalStore.create<Array<{
        id: string;
        startTime: number;
        endTime: number;
        videoBlob: Blob;
        sensorData: Array<{x: number, y: number, z: number, timestamp: number}>;
        duration: number;
    }>>("saved-recordings", []).then(store => {
        recordingsStore = store;
        recordings = loadRecordings();
    });
    // Check for ?mockmicrobit=1 in the URL
    const params = new URLSearchParams(window.location.search);
    useMockMicroBit = params.get('mockmicrobit') === '1';
}

function loadRecordings(): Array<any> {
    if (!recordingsStore) return [];
    const raw = recordingsStore.get() || [];
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

// PeerJS connection handlers
function handleIdChange(id: string) {
    otherId = id;
}
function handleConnect() {
    if (peer && otherId) {
        const conn = peer.connect(otherId);
        conn.on('open', () => {
            connection = conn;
        });
        conn.on('data', (data) => {
            handleIncomingData(data);
        });
        conn.on('close', () => {
            connection = null;
        });
        conn.on('error', (err) => {
            // Optionally handle error
        });
    }
}
function handleDisconnect() {
    clearDataHistory();
    if (connection) {
        connection.close();
        connection = null;
    }
}
function handleIncomingData(rawData: any) {
    try {
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        if (data.type === 'accelerometer' && data.data) {
            accelerometerData = data.data;
            dataHistory = [...dataHistory.slice(-99), data.data];
            isReceivingData = true;
            if (isRecording) {
                recordingSensorData = [...recordingSensorData, data.data];
            }
        }
    } catch (error) {
        // Optionally handle error
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
    recordings = [...recordings];
}

// micro:bit event handlers
function handleMicroBitData(x: number, y: number, z: number) {
    const timestamp = Date.now();
    const newData = { x, y, z, timestamp };
    accelerometerData = newData;
    dataHistory = [...dataHistory.slice(-99), newData];
    isReceivingData = true;
    if (isRecording) {
        recordingSensorData = [...recordingSensorData, newData];
    }
}
function handleMicroBitConnectionChange(connected: boolean) {
    isMicroBitConnected = connected;
    if (!connected && inputSource === 'microbit') {
        clearDataHistory();
    }
}

// PeerJS and inputSource effects
$effect(() => {
    if (browser && inputSource === 'webrtc' && !peer) {
        const newPeer = new Peer();
        peer = newPeer;
        newPeer.on('open', id => {
            peerStatus = 'Connected';
            peerId = id;
        });
        newPeer.on("connection", (conn) => {
            connection = conn;
            conn.on("data", (data) => {
                handleIncomingData(data);
            });
            conn.on("open", () => {
                conn.send(JSON.stringify({
                    type: 'welcome',
                    message: 'Connected to desktop'
                }));
            });
            conn.on('close', () => {
                clearDataHistory();
                connection = null;
            });
        });
        newPeer.on('close', () => {
            peerStatus = 'Disconnected';
        });
    } else if (inputSource !== 'webrtc' && peer) {
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
$effect(() => {
    clearDataHistory();
});

// Derived
let allowRecording = $derived((inputSource === 'webrtc' && !!connection) || (inputSource === 'microbit' && isMicroBitConnected));

</script>

<InputSourceSelector
    {inputSource}
    onChange={(val) => (inputSource = val)}
/>
<div class="space-y-6">
    {#if inputSource === 'webrtc'}
        <div class="mb-8 p-6 bg-gray-50 rounded-xl">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <PeerStatus {peerId} {peerStatus} />
                <QRCodeDisplay {peerId} />
            </div>
        </div>
        <ConnectionSection
            {inputSource}
            {otherId}
            {peer}
            {connection}
            onIdChange={handleIdChange}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onMicroBitData={handleMicroBitData}
            onMicroBitConnectionChange={handleMicroBitConnectionChange}
            {useMockMicroBit}
        />
    {:else if inputSource === 'microbit'}
        <MicroBitController 
            onDataReceived={handleMicroBitData}
            onConnectionChange={handleMicroBitConnectionChange}
            useMock={useMockMicroBit}
        />
    {:else if inputSource === 'pose'}
        <PoseInputController />
    {/if}
    <WebcamRecorder 
        onRecordingStart={handleRecordingStart}
        onRecordingStop={handleRecordingStop}
        {allowRecording}
        enablePoseDetection={inputSource === 'pose' ? true : false}
    />
    {#if recordings.length > 0}
        <RecordingsList 
            {recordings}
            onDeleteRecording={handleDeleteRecording}
            onPlayRecording={handlePlayRecording}
            {savedSelections}
        />
    {/if}
    <PlaybackModal 
        recording={selectedRecording}
        onClose={handleClosePlayback}
        {savedSelections}
    />
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
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white rounded-lg p-4 shadow-sm">
                        <div class="text-sm font-medium text-gray-500 mb-1">X-Axis</div>
                        <div class="text-2xl font-mono text-blue-600">
                            {accelerometerData.x?.toFixed(3)}
                        </div>
                        <div class="text-xs text-gray-400">m/s²</div>
                    </div>
                    <div class="bg-white rounded-lg p-4 shadow-sm">
                        <div class="text-sm font-medium text-gray-500 mb-1">Y-Axis</div>
                        <div class="text-2xl font-mono text-green-600">
                            {accelerometerData.y?.toFixed(3)}
                        </div>
                        <div class="text-xs text-gray-400">m/s²</div>
                    </div>
                    <div class="bg-white rounded-lg p-4 shadow-sm">
                        <div class="text-sm font-medium text-gray-500 mb-1">Z-Axis</div>
                        <div class="text-2xl font-mono text-purple-600">
                            {accelerometerData.z?.toFixed(3)}
                        </div>
                        <div class="text-xs text-gray-400">m/s²</div>
                    </div>
                </div>
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
                                {accelerometerData.timestamp ? new Date(accelerometerData.timestamp).toLocaleTimeString() : ''}
                            </div>
                        </div>
                        <div>
                            <div class="text-gray-500">Magnitude</div>
                            <div class="font-mono">
                                {accelerometerData.x !== undefined && accelerometerData.y !== undefined && accelerometerData.z !== undefined ? Math.sqrt(accelerometerData.x**2 + accelerometerData.y**2 + accelerometerData.z**2).toFixed(3) : ''}
                            </div>
                        </div>
                        <div>
                            <div class="text-gray-500">Status</div>
                            <div class="text-green-600 font-medium">Active</div>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <AccelerometerChart data={dataHistory} maxDataPoints={50} />
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
        onclick={stepForward}
        class="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        aria-label="Next: Train Model"
    >
        Next: Train Model &rarr;
    </button>
</div>
