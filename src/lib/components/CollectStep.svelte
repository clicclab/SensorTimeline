<script lang="ts">
import InputSourceSelector from "$lib/components/InputSourceSelector.svelte";
import ConnectionSection from "$lib/components/ConnectionSection.svelte";
import MicroBitController from "$lib/components/MicroBitController.svelte";
import WebcamRecorder from "$lib/components/WebcamRecorder.svelte";
import RecordingsList from "$lib/components/RecordingsList.svelte";
import PeerStatus from "$lib/components/PeerStatus.svelte";
import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
import AccelerometerChart from "$lib/components/AccelerometerChart.svelte";
import MagnitudeChart from "$lib/components/MagnitudeChart.svelte";

type CollectStepProps = {
    inputSource: 'webrtc' | 'microbit';
    onInputSourceChange: (val: 'webrtc' | 'microbit') => void;
    peerId: string | null;
    peerStatus: string | null;
    otherId: string;
    peer: any;
    connection: any;
    onIdChange: (id: string) => void;
    onConnect: () => void;
    onDisconnect: () => void;
    onMicroBitData: (x: number, y: number, z: number) => void;
    onMicroBitConnectionChange: (connected: boolean) => void;
    useMockMicroBit: boolean;
    isMicroBitConnected: boolean;
    onRecordingStart: (startTime: number) => void;
    onRecordingStop: (endTime: number, videoBlob: Blob) => void;
    allowRecording: boolean;
    recordings: Array<any>;
    onDeleteRecording: (id: string) => void;
    onPlayRecording: (rec: any) => void;
    accelerometerData: {x: number, y: number, z: number, timestamp: number} | null;
    dataHistory: Array<{x: number, y: number, z: number, timestamp: number}>;
    isReceivingData: boolean;
    clearDataHistory: () => void;
    stepForward: () => void;
};

let { inputSource, onInputSourceChange, peerId, peerStatus, otherId, peer, connection, onIdChange, onConnect, onDisconnect, onMicroBitData, onMicroBitConnectionChange, useMockMicroBit, isMicroBitConnected, onRecordingStart, onRecordingStop, allowRecording, recordings, onDeleteRecording, onPlayRecording, accelerometerData, dataHistory, isReceivingData, clearDataHistory, stepForward }: CollectStepProps = $props();
</script>

<InputSourceSelector
    {inputSource}
    onChange={onInputSourceChange}
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
            onIdChange={onIdChange}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onMicroBitData={onMicroBitData}
            onMicroBitConnectionChange={onMicroBitConnectionChange}
            {useMockMicroBit}
        />
    {:else if inputSource === 'microbit'}
        <MicroBitController 
            onDataReceived={onMicroBitData}
            onConnectionChange={onMicroBitConnectionChange}
            useMock={useMockMicroBit}
        />
    {/if}
    <WebcamRecorder 
        onRecordingStart={onRecordingStart}
        onRecordingStop={onRecordingStop}
        {allowRecording}
    />
    {#if recordings.length > 0}
        <RecordingsList 
            {recordings}
            onDeleteRecording={onDeleteRecording}
            onPlayRecording={onPlayRecording}
        />
    {/if}
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
