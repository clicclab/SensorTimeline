<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import {
        Chart,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        LineController,
        Title,
        Tooltip,
        Legend,
        Filler,
        type ChartData,
        type ChartOptions
    } from 'chart.js';

    // Register Chart.js components
    Chart.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        LineController,
        Title,
        Tooltip,
        Legend,
        Filler
    );

    export let data: Array<{x: number, y: number, z: number, timestamp: number}> = [];
    export let maxDataPoints: number = 50;
    export let recordingStartTime: number | undefined = undefined;
    export let currentVideoTime: number | undefined = undefined;

    let chartCanvas: HTMLCanvasElement;
    let chart: Chart;

    const chartData: ChartData<'line'> = {
        labels: [],
        datasets: [
            {
                label: 'X-Axis',
                data: [],
                borderColor: 'rgb(59, 130, 246)', // blue-500
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.1,
                pointRadius: 1,
                pointHoverRadius: 4
            },
            {
                label: 'Y-Axis',
                data: [],
                borderColor: 'rgb(34, 197, 94)', // green-500
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.1,
                pointRadius: 1,
                pointHoverRadius: 4
            },
            {
                label: 'Z-Axis',
                data: [],
                borderColor: 'rgb(168, 85, 247)', // purple-500
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.1,
                pointRadius: 1,
                pointHoverRadius: 4
            }
        ]
    };

    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0 // Disable animations for real-time updates
        },
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            title: {
                display: true,
                text: recordingStartTime !== undefined ? 'Accelerometer Data (Playback)' : 'Real-time Accelerometer Data',
                font: {
                    size: 16,
                    weight: 'bold'
                }
            },
            legend: {
                position: 'top'
            },
            tooltip: {
                callbacks: {
                    title: function(context) {
                        const videoTime = parseFloat(context[0].label);
                        const minutes = Math.floor(videoTime / 60);
                        const seconds = (videoTime % 60).toFixed(1);
                        return `${minutes}:${seconds.padStart(4, '0')}`;
                    },
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(3)} m/s²`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'category',
                display: true,
                title: {
                    display: true,
                    text: 'Video Time (seconds)'
                },
                ticks: {
                    maxTicksLimit: 10,
                    callback: function(value, index) {
                        const videoTime = chartData.labels?.[index] as number;
                        if (videoTime !== undefined) {
                            const minutes = Math.floor(videoTime / 60);
                            const seconds = videoTime % 60;
                            
                            if (minutes > 0) {
                                // For longer videos, show MM:SS format
                                return `${minutes}:${Math.floor(seconds).toString().padStart(2, '0')}`;
                            } else if (videoTime >= 10) {
                                // For videos 10+ seconds, show whole seconds
                                return `${Math.floor(seconds)}s`;
                            } else {
                                // For short videos, show fractional seconds
                                return `${seconds.toFixed(1)}s`;
                            }
                        }
                        return '';
                    }
                }
            },
            y: {
                type: 'linear',
                display: true,
                title: {
                    display: true,
                    text: 'Acceleration (m/s²)'
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            }
        }
    };

    function updateChart() {
        if (!chart || !data.length) return;

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
        if (recordingStartTime !== undefined) {
            // For playback mode, use the first sensor data point as time zero
            // This ensures the chart starts at 0 regardless of any timing offset
            const firstTimestamp = recentData.length > 0 ? recentData[0].timestamp : recordingStartTime;
            chartData.labels = recentData.map(d => (d.timestamp - firstTimestamp) / 1000);
        } else {
            // Fallback to absolute timestamps for real-time mode
            chartData.labels = recentData.map(d => d.timestamp);
        }
        
        // Update datasets
        chartData.datasets[0].data = recentData.map(d => d.x);
        chartData.datasets[1].data = recentData.map(d => d.y);
        chartData.datasets[2].data = recentData.map(d => d.z);
        
        chart.update('none'); // Update without animation for real-time feel
    }

    onMount(() => {
        if (chartCanvas) {
            chart = new Chart(chartCanvas, {
                type: 'line',
                data: chartData,
                options: chartOptions
            });
        }
    });

    onDestroy(() => {
        if (chart) {
            chart.destroy();
        }
    });

    // Reactive statement to update chart when data changes
    $: if (chart && data) {
        updateChart();
    }
</script>

<div class="bg-white rounded-lg p-4 shadow-sm">
    <div class="h-80 w-full">
        <canvas bind:this={chartCanvas}></canvas>
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
        </div>
        {#if recordingStartTime === undefined}
            <div class="text-gray-500">
                {data.length} total readings
            </div>
        {/if}
    </div>
</div>
