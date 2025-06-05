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
                text: 'Real-time Accelerometer Data',
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
                            const seconds = Math.floor(videoTime % 60);
                            return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
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

        // Get the last maxDataPoints entries
        const recentData = data.slice(-maxDataPoints);
        
        // Convert timestamps to video time (seconds from recording start)
        if (recordingStartTime !== undefined) {
            chartData.labels = recentData.map(d => (d.timestamp - recordingStartTime) / 1000);
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
            <span class="text-gray-600">Showing last {maxDataPoints} readings</span>
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
        <div class="text-gray-500">
            {data.length} total readings
        </div>
    </div>
</div>
