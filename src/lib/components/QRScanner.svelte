<script lang="ts">
    import { browser } from "$app/environment";
    import QrScanner from "qr-scanner";

    interface Props {
        isOpen: boolean;
        onScan: (result: string) => void;
        onClose: () => void;
    }

    let { isOpen, onScan, onClose }: Props = $props();
    let videoElement: HTMLVideoElement | null = $state(null);
    let qrScanner: QrScanner | null = null;

    async function startScanner() {
        if (!browser || !videoElement) return;

        try {
            qrScanner = new QrScanner(
                videoElement,
                (result) => {
                    onScan(result.data);
                    stopScanner();
                },
                {
                    returnDetailedScanResult: true,
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                }
            );
            await qrScanner.start();
        } catch (error) {
            console.error('Error starting QR scanner:', error);
            onClose();
        }
    }

    function stopScanner() {
        if (qrScanner) {
            qrScanner.stop();
            qrScanner.destroy();
            qrScanner = null;
        }
        onClose();
    }

    // Start scanner when modal opens
    $effect(() => {
        if (isOpen && videoElement) {
            // Small delay to ensure DOM is ready
            setTimeout(startScanner, 100);
        }
    });

    // Cleanup on unmount
    $effect(() => {
        return () => {
            if (qrScanner) {
                qrScanner.stop();
                qrScanner.destroy();
            }
        };
    });
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900">Scan QR Code</h3>
                <button 
                    onclick={stopScanner}
                    class="text-gray-500 hover:text-gray-700 text-2xl"
                >
                    ×
                </button>
            </div>
            <div class="relative">
                <video 
                    bind:this={videoElement}
                    class="w-full h-64 bg-gray-100 rounded-lg object-cover"
                    style="aspect-ratio: 1/1;"
                ><track kind="captions" /></video>
                <div class="absolute inset-0 border-2 border-white rounded-lg pointer-events-none"></div>
            </div>
            <p class="text-sm text-gray-600 mt-3 text-center">
                Point your camera at a QR code to scan the Peer ID
            </p>
            <button 
                onclick={stopScanner}
                class="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
            >
                Cancel
            </button>
        </div>
    </div>
{/if}
