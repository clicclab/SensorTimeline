<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as Plotly from 'plotly.js-dist';

    export let data: Array<{x: number, y: number, z: number, timestamp: number}> = [];
    export let maxDataPoints: number = 50;
    export let recordingStartTime: number | undefined = undefined;

    let plotDiv: HTMLDivElement;
    let plotInitialized = false;

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
        
        // Calculate magnitude for each data point
        const magnitudeData = recentData.map(d => 
            Math.sqrt(d.x ** 2 + d.y ** 2 + d.z ** 2)
        );
        
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
                y: magnitudeData,
                type: 'scatter',
                mode: 'lines',
                name: 'Magnitude',
                line: { color: 'rgb(239, 68, 68)', width: 2 },
                fill: 'tonexty',
                fillcolor: 'rgba(239, 68, 68, 0.1)'
            }
        ];

        const layout = {
            title: {
                text: recordingStartTime !== undefined ? 'Acceleration Magnitude (Playback)' : 'Acceleration Magnitude',
                font: { size: 16 }
            },
            xaxis: {
                title: 'Video Time (seconds)',
                showgrid: true,
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                tickformat: '.1f'
            },
            yaxis: {
                title: 'Magnitude (m/s²)',
                showgrid: true,
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                rangemode: 'tozero'
            },
            margin: { l: 60, r: 30, t: 50, b: 60 },
            autosize: true,
            showlegend: false,
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
                { 
                    x: [], 
                    y: [], 
                    type: 'scatter', 
                    mode: 'lines', 
                    name: 'Magnitude', 
                    line: { color: 'rgb(239, 68, 68)', width: 2 },
                    fill: 'tonexty',
                    fillcolor: 'rgba(239, 68, 68, 0.1)'
                }
            ];

            const layout = {
                title: {
                    text: recordingStartTime !== undefined ? 'Acceleration Magnitude (Playback)' : 'Acceleration Magnitude',
                    font: { size: 16 }
                },
                xaxis: {
                    title: 'Video Time (seconds)',
                    showgrid: true,
                    gridcolor: 'rgba(0, 0, 0, 0.1)'
                },
                yaxis: {
                    title: 'Magnitude (m/s²)',
                    showgrid: true,
                    gridcolor: 'rgba(0, 0, 0, 0.1)',
                    rangemode: 'tozero'
                },
                margin: { l: 60, r: 30, t: 50, b: 60 },
                autosize: true,
                showlegend: false,
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
    $: if (plotInitialized && data) {
        updateChart();
    }
</script>

<div class="bg-white rounded-lg p-4 shadow-sm">
    <div class="h-48 w-full">
        <div bind:this={plotDiv} class="w-full h-full"></div>
    </div>
    
    <!-- Chart Info -->
    <div class="mt-2 flex items-center justify-between text-sm">
        {#if recordingStartTime === undefined}
            <div class="text-gray-500">
                {data.length > 0 ? `Current: ${Math.sqrt(data[data.length-1]?.x**2 + data[data.length-1]?.y**2 + data[data.length-1]?.z**2).toFixed(3)} m/s²` : 'No data'}
            </div>
        {/if}
    </div>
</div>
