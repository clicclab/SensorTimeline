<script lang="ts">
    import { initModelStore, modelStore } from "$lib/modelStore";
    import { nnPredict, type NNClassifierModel } from "$lib/nn";
    import { classifyWithKnnModel, type KnnClassifierModel } from "$lib/knn";
    import InputSourceSelector from "$lib/components/InputSourceSelector.svelte";
    import WebcamRecorder from "$lib/components/WebcamRecorder.svelte";
    import Peer from "peerjs";
    import ConnectionSection from "$lib/components/ConnectionSection.svelte";
    import MicroBitController from "$lib/components/MicroBitController.svelte";
    import PeerStatus from "$lib/components/PeerStatus.svelte";
    import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
    import AccelerometerChart from "$lib/components/AccelerometerChart.svelte";
    import MagnitudeChart from "$lib/components/MagnitudeChart.svelte";
    import { browser } from "$app/environment";
    import { dtwDistance } from "$lib/dtw";
    import { onDestroy, onMount } from "svelte";
    import MdsPlot from "$lib/components/ui/MdsPlot.svelte";
    import type { AccelerometerDataPoint, PoseDataPoint } from "$lib/types";
    import type { Session } from "$lib/session";
    import { normalizeSkeletonToHipCenter } from "$lib/mediapipe";
    import { filterToUsedLandmarks } from "$lib/poseLandmarks";


    type TestStepProps = {
        stepBack: () => void;
        session: Session;
    };
    let { stepBack, session }: TestStepProps = $props();

    let model: NNClassifierModel | KnnClassifierModel | null = $state(null);

    onMount(async () => {
        await initModelStore();
        model = modelStore.get();
        modelStore.subscribe(value => {
            model = value;
        });
    });

    // Input source
    let inputSource: 'webrtc' | 'microbit' | 'pose' | null = $state(null);

    $effect(() => {
        if (session.type === 'pose') {
            inputSource = 'pose';
            console.log('Setting input source to pose');
        }
    });

    // PeerJS state
    let peer: Peer | null = $state.raw(null);
    let peerId: string | null = $state(null);
    let peerStatus: string | null = $state(null);
    let connection: any = $state.raw(null);
    let otherId: string = $state('');

    // Accelerometer state
    let accelerometerData: AccelerometerDataPoint | null = $state(null);
    let dataHistory: Array<AccelerometerDataPoint> | Array<PoseDataPoint> = $state([]);
    let isReceivingData: boolean = $state(false);

    // micro:bit state
    let isMicroBitConnected: boolean = $state(false);
    let useMockMicroBit = $state(false);

    // Prediction state
    let predictedLabel: string | null = $state(null);

    let showMds: boolean = $state(false);

    $inspect(model);

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
            conn.on('error', (err) => {});
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
            }
        } catch (error) {}
    }

    function clearDataHistory() {
        dataHistory = [];
        accelerometerData = null;
        isReceivingData = false;
    }

    function handleMicroBitData(x: number, y: number, z: number) {
        const timestamp = Date.now();
        const newData = { x, y, z, timestamp };
        accelerometerData = newData;
        dataHistory = [...dataHistory.slice(-99), newData];
        isReceivingData = true;
    }

    function handleMicroBitConnectionChange(connected: boolean) {
        isMicroBitConnected = connected;
        if (!connected && inputSource === 'microbit') {
            clearDataHistory();
        }
    }

    // DTW distance is now imported from $lib/dtw

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
          
    let predictInterval: NodeJS.Timeout | null = null;
    let mdsUpdateInterval: NodeJS.Timeout | null = null;

    let isPredicting: boolean = $state(false);

    if(browser) {
        predictInterval = setInterval(() => {
            if (dataHistory.length >= 50 && !isPredicting) {
                // Update the predicted label every second
                console.log('Updating predicted label');
                isPredicting = true;
                predictLabel();
                console.log('Predicted label:', predictedLabel);
                isPredicting = false;
            }
        }, 500);

        // Update MDS points every 100ms
        mdsUpdateInterval = setInterval(() => {
            if (!model) return;
            if(!showMds) return;
            if (isKnnModel(model)) {
                let knnModel = model as KnnClassifierModel;
                if(dataHistory.length >= 50) {
                    const segments = knnModel.segments;
                    const data = dataHistory.slice(-50).map(d => [d.x, d.y, d.z]);
                    mdsLabels = [...segments.map(s => s.label), 'Current Data'];
                    mdsPoints = [...segments.map(s => s.data), data];
                } else {
                    const segments = knnModel.segments;
                    mdsLabels = segments.map(s => s.label);
                    mdsPoints = segments.map(s => s.data);
                }
            } else {
                mdsLabels = [];
                mdsPoints = [];
            }
        }, 100);
    }

    onDestroy(() => {
        if (predictInterval) {
            clearInterval(predictInterval);
        }
        if (mdsUpdateInterval) {
            clearInterval(mdsUpdateInterval);
        }
    });

    function isKnnModel(model: any): boolean {
      return model && Array.isArray(model.segments);
    }
    
    function isNNModel(model: any): boolean {
      return model && Array.isArray(model.outputLabels);
    }

    function predictLabel() {
        if (!model || (!accelerometerData && (inputSource === 'microbit' || inputSource === 'webrtc'))) {
            predictedLabel = null;
            return;
        }

        if (dataHistory.length < 100) {
            // Not enough data to make a prediction
            console.warn('Not enough data to make a prediction');
            predictedLabel = null;
            return;
        }

        let data: number[][] = [];
        let inputFeatures = 3;
        if (inputSource === 'pose') {
            // Each dataHistory entry is a pose landmark array: [{x, y, z, ...}, ...]
            // We'll flatten each pose to a 1D array of [x0, y0, z0, x1, y1, z1, ...]
            // and stack them as timesteps
            const poseFrames = dataHistory.slice(-100);
            if (poseFrames.length > 0) {
                inputFeatures = poseFrames[0].landmarks.length * 3;
                data = poseFrames.map((pose: any) => {
                    // pose is an array of landmarks
                    return pose.landmarks.flatMap((l: any) => [l.x, l.y, l.z]);
                });
            } else {
                // Not enough pose data, skip prediction
                predictedLabel = null;
                console.warn('Not enough pose data to make a prediction');
                return;
            }
        } else {
            // Accelerometer: [x, y, z]
            data = dataHistory.slice(-100).map(d => [d.x, d.y, d.z]);
            inputFeatures = 3;
        }

        if (isNNModel(model)) {
            let nnModel = model as NNClassifierModel;
            // Pass 2D array directly (not flattened)
            nnPredict(nnModel, data, inputFeatures).then(result => {
                predictedLabel = typeof result === 'string' ? result : null;
            }).catch(err => {
                predictedLabel = null;
                console.error('NN prediction error:', err);
            });
        } else if (isKnnModel(model)) {
            console.log('Using k-NN model for prediction');
            let knnModel = model as KnnClassifierModel;
            const result = classifyWithKnnModel(knnModel, data, dtwDistance);
            predictedLabel = typeof result === 'string' ? result : null;
            console.log('Predicted label:', predictedLabel);
        } else {
            predictedLabel = null;
        }
    }

    // MDS plot state for k-NN model
    let mdsPoints: number[][][] = $state([]);
    let mdsLabels: string[] = $state([]);
    let mdsColors: Record<string, string> = $derived(
      Array.from(new Set(mdsLabels)).reduce((acc, label, i) => {
        const palette = [
          "#2563eb", "#16a34a", "#dc2626", "#f59e42", "#a21caf", "#eab308", "#0ea5e9", "#7c3aed", "#f43f5e", "#64748b"
        ];
        acc[label] = palette[i % palette.length] || "#888";
        return acc;
      }, {} as Record<string, string>)
    );

    // Set inputSource based on session.type, and allow switching only for accelerometer
    $effect(() => {
        if (session.type === 'pose') {
            inputSource = 'pose';
        }
    });

    const onPoseChange = (pose: PoseDataPoint) => {
        if (inputSource === 'pose') {
            // Add pose data to history
            let temp = normalizeSkeletonToHipCenter(pose.landmarks);
            temp = filterToUsedLandmarks(temp);
            dataHistory = [...dataHistory.slice(-99), { ...pose, landmarks: temp }];
            isReceivingData = true;
        }
    };
</script>

<div class="bg-white rounded-xl p-8 text-center mb-6">
  <h2 class="text-2xl font-bold mb-4">Test Model</h2>
  {#if model}
    <div class="mb-4">
      <h3 class="text-lg font-semibold mb-2">Model Info</h3>
      {#if isNNModel(model)}
        <p class="text-gray-600 mb-2">Neural Network Model</p>
      {:else if isKnnModel(model)}
        <p class="text-gray-600 mb-2">k-NN Model</p>
      {:else}
        <p class="text-gray-600 mb-2">Unknown Model Type</p>
      {/if}
    </div>
    {#if model && mdsPoints.length >= 2}
      <div class="mb-6 relative">

        {#if showMds}
            <h3 class="text-lg font-semibold mb-2">MDS Plot of Labeled Segments</h3>
            <MdsPlot
            points={mdsPoints}
            labels={mdsLabels}
            colors={mdsColors}
            distance={dtwDistance}
            width={400}
            height={320}
            padding={32}
            />
            <div class="flex flex-wrap gap-4 mt-4 justify-center">
            {#each Array.from(new Set(mdsLabels)) as label}
                <div class="flex items-center gap-2 text-sm">
                <span class="inline-block w-4 h-4 rounded-full" style={`background:${mdsColors[label]}`}></span>
                <span>{label}</span>
                </div>
            {/each}
            </div>
            <button
                class="absolute top-0 right-0 mt-2 mr-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                onclick={() => (showMds = false)}
            >
                Hide MDS Plot
            </button>
        {:else}
            <button
                class="absolute top-0 right-0 mt-2 mr-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                onclick={() => (showMds = true)}
            >
                Show MDS Plot
            </button>
        {/if}

      </div>
    {/if}
  {:else}
    <p class="text-gray-600 mb-4">No trained model found. Please train a model first.</p>
  {/if}
</div>

{#if accelerometerData || (inputSource === 'pose' && dataHistory.length > 0)}
    <div class="bg-white rounded-lg p-4 shadow-sm mb-4 mt-4">
        <div class="flex items-center justify-between">
            <h3 class="font-medium text-gray-900">Live Prediction</h3>
            <span class="text-lg font-mono px-3 py-1 rounded bg-blue-100 text-blue-700" aria-live="polite">
                {predictedLabel ?? '—'}
            </span>
        </div>
    </div>
{/if}

{#if session.type === 'accelerometer'}
    <InputSourceSelector
        {inputSource}
        onChange={(val) => (inputSource = val)}
    />
{/if}
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
{/if}

<div class=" mt-4">
    <WebcamRecorder 
        allowRecording={false}
        enablePoseDetection={inputSource === 'pose'}
        onPoseChange={onPoseChange}
    />
</div>

{#if (inputSource === 'webrtc' && connection) || (inputSource === 'microbit' && isMicroBitConnected)}
    <div class="bg-gray-50 rounded-xl p-6 mt-6">
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
            <div class="bg-white rounded-lg p-4 shadow-sm mb-4">
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

<div class="flex justify-start mt-8">
    <button
        onclick={stepBack}
        class="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold shadow hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        aria-label="Back: Train Model"
    >
        &larr; Back: Train Model
    </button>
</div>
