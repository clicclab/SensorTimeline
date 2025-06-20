<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as Plotly from 'plotly.js-dist';

    type Props = {
        data?: Array<{x: number, y: number, z: number, timestamp: number}>;
        maxDataPoints?: number;
        recordingStartTime?: number;
        currentVideoTime?: number;
    };

    let { data = [], maxDataPoints = 50, recordingStartTime, currentVideoTime }: Props = $props();


    let plotDiv: HTMLDivElement;
    let plotInitialized = $state(false);

    function resetZoom() {
        if (plotDiv && plotInitialized) {
            Plotly.relayout(plotDiv, {
                'xaxis.autorange': true,
                'yaxis.autorange': true
            });
        }
    }

    function updateChart() {
        if (!plotDiv || !data.length || !plotInitialized) return;

        let recentData;
        
        // In playback mode, show all data; in real-time mode, show last maxDataPoints
        if (recordingStartTime !== undefined) {
            // Playback mode - show all data from recording
            recentData = data;
        } else {
            // Real-time mode - show last maxDataPoints entries
            recentData = data.slice(-maxDataPoints);
        }
        
        // Convert timestamps to video time (seconds from recording start)
        let timeLabels: number[];
        if (recordingStartTime !== undefined) {
            // For playback mode, use the first sensor data point as time zero
            const firstTimestamp = recentData.length > 0 ? recentData[0].timestamp : recordingStartTime;
            timeLabels = recentData.map(d => (d.timestamp - firstTimestamp) / 1000);
        } else {
            // For real-time mode, use relative timestamps
            const firstTimestamp = recentData.length > 0 ? recentData[0].timestamp : 0;
            timeLabels = recentData.map(d => (d.timestamp - firstTimestamp) / 1000);
        }
        
        // Prepare data for Plotly
        const plotData = [
            {
                x: timeLabels,
                y: recentData.map(d => d.x),
                type: 'scatter',
                mode: 'lines',
                name: 'X-Axis',
                line: { color: 'rgb(59, 130, 246)', width: 2 }
            },
            {
                x: timeLabels,
                y: recentData.map(d => d.y),
                type: 'scatter',
                mode: 'lines',
                name: 'Y-Axis',
                line: { color: 'rgb(34, 197, 94)', width: 2 }
            },
            {
                x: timeLabels,
                y: recentData.map(d => d.z),
                type: 'scatter',
                mode: 'lines',
                name: 'Z-Axis',
                line: { color: 'rgb(168, 85, 247)', width: 2 }
            }
        ];

        const layout = {
            title: {
                text: recordingStartTime !== undefined ? 'Accelerometer Data (Playback)' : 'Real-time Accelerometer Data',
                font: { size: 16 }
            },
            xaxis: {
                title: 'Video Time (seconds)',
                showgrid: true,
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                tickformat: '.1f'
            },
            yaxis: {
                title: 'Acceleration (m/s²)',
                showgrid: true,
                gridcolor: 'rgba(0, 0, 0, 0.1)'
            },
            margin: { l: 60, r: 30, t: 50, b: 60 },
            autosize: true,
            showlegend: true,
            legend: {
                orientation: 'h',
                x: 0,
                y: -0.2
            },
            hovermode: 'x unified'
        };

        const config = {
            responsive: true,
            displayModeBar: false,
            doubleClick: false,
            showTips: false
        };

        Plotly.react(plotDiv, plotData, layout, config);
    }

    onMount(() => {
        if (plotDiv) {
            // Initialize empty plot
            const initialData = [
                { x: [], y: [], type: 'scatter', mode: 'lines', name: 'X-Axis', line: { color: 'rgb(59, 130, 246)', width: 2 } },
                { x: [], y: [], type: 'scatter', mode: 'lines', name: 'Y-Axis', line: { color: 'rgb(34, 197, 94)', width: 2 } },
                { x: [], y: [], type: 'scatter', mode: 'lines', name: 'Z-Axis', line: { color: 'rgb(168, 85, 247)', width: 2 } }
            ];

            const layout = {
                title: {
                    text: recordingStartTime !== undefined ? 'Accelerometer Data (Playback)' : 'Real-time Accelerometer Data',
                    font: { size: 16 }
                },
                xaxis: {
                    title: 'Video Time (seconds)',
                    showgrid: true,
                    gridcolor: 'rgba(0, 0, 0, 0.1)'
                },
                yaxis: {
                    title: 'Acceleration (m/s²)',
                    showgrid: true,
                    gridcolor: 'rgba(0, 0, 0, 0.1)'
                },
                margin: { l: 60, r: 30, t: 50, b: 60 },
                autosize: true,
                showlegend: true,
                legend: {
                    orientation: 'h',
                    x: 0,
                    y: -0.2
                },
                hovermode: 'x unified'
            };

            const config = {
                responsive: true,
                displayModeBar: false,
                doubleClick: false,
                showTips: false
            };

            Plotly.newPlot(plotDiv, initialData, layout, config).then(() => {
                plotInitialized = true;
                updateChart();
            });
        }
    });

    onDestroy(() => {
        if (plotDiv && plotInitialized) {
            Plotly.purge(plotDiv);
        }
    });

    // Reactive statement to update chart when data changes
    $effect(() => {
        if (plotInitialized && data) {
            updateChart();
        }
    });
</script>

<div class="bg-white rounded-lg p-4 shadow-sm">
    <div class="h-80 w-full">
        <div bind:this={plotDiv} class="w-full h-full"></div>
    </div>
    
    <!-- Chart Controls -->
    <div class="mt-4 flex items-center justify-between text-sm">
        <div class="flex items-center space-x-4">
            {#if recordingStartTime === undefined}
                <span class="text-gray-600">Showing last {maxDataPoints} readings</span>
            {/if}
            <div class="flex items-center space-x-2">
                <div class="w-3 h-1 bg-blue-500 rounded"></div>
                <span class="text-blue-600">X-Axis</span>
            </div>
            <div class="flex items-center space-x-2">
                <div class="w-3 h-1 bg-green-500 rounded"></div>
                <span class="text-green-600">Y-Axis</span>
            </div>
            <div class="flex items-center space-x-2">
                <div class="w-3 h-1 bg-purple-500 rounded"></div>
                <span class="text-purple-600">Z-Axis</span>
            </div>
            {#if recordingStartTime !== undefined}
                <button 
                    onclick={resetZoom}
                    class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                    disabled={!plotInitialized}
                >
                    Reset Zoom
                </button>
            {/if}
        </div>
        {#if recordingStartTime === undefined}
            <div class="text-gray-500">
                {data.length} total readings
            </div>
        {/if}
    </div>
</div>
