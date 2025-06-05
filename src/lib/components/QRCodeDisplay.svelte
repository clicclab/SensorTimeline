<script lang="ts">
    import { browser } from "$app/environment";
    import QRCode from "qrcode";

    interface Props {
        peerId: string | null;
    }

    let { peerId }: Props = $props();
    let qrCodeDataUrl: string | null = $state(null);

    // Generate QR code when peerId changes
    async function generateQRCode(id: string) {
        try {
            const dataUrl = await QRCode.toDataURL(id, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#1f2937', // Gray-800
                    light: '#ffffff'
                }
            });
            qrCodeDataUrl = dataUrl;
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }

    // Reactive effect to generate QR code when peerId changes
    $effect(() => {
        if (peerId && browser) {
            generateQRCode(peerId);
        }
    });
</script>

<div class="flex flex-col items-center justify-center">
    <label class="block text-sm font-semibold text-gray-700 mb-2 text-center" for="qrCodeContainer">QR Code</label>
    <div class="bg-white p-4 rounded-xl shadow-inner border-2 border-gray-200" id="qrCodeContainer">
        {#if qrCodeDataUrl}
            <img 
                src={qrCodeDataUrl} 
                alt="QR Code for Peer ID" 
                class="w-32 h-32 lg:w-40 lg:h-40 object-contain"
                style="aspect-ratio: 1/1;"
            />
        {:else}
            <div class="w-32 h-32 lg:w-40 lg:h-40 bg-gray-100 rounded-lg flex items-center justify-center" style="aspect-ratio: 1/1;">
                <div class="text-center">
                    <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <span class="text-xs text-gray-600">Generating...</span>
                </div>
            </div>
        {/if}
    </div>
    <p class="text-xs text-gray-600 mt-2 text-center">Scan to connect</p>
</div>
