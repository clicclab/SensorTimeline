<script lang="ts">
    import ActionButtons from "./ActionButtons.svelte";
    import ConnectionForm from "./ConnectionForm.svelte";
    import MicroBitController from "./MicroBitController.svelte";
    import QrScanner from "./QRScanner.svelte";

	type Props = {
		inputSource: 'webrtc' | 'microbit';
		otherId: string;
		peer: any;
		connection: any;
		onIdChange: (id: string) => void;
		onConnect: () => void;
		onDisconnect: () => void;
		onMicroBitData: (x: number, y: number, z: number) => void;
		onMicroBitConnectionChange: (connected: boolean) => void;
		useMockMicroBit: boolean;
	};
	let {
		inputSource,
		otherId,
		peer,
		connection,
		onIdChange,
		onConnect,
		onDisconnect,
		onMicroBitData,
		onMicroBitConnectionChange,
		useMockMicroBit
	} = $props();

	let showScanner = $state(false);

	function handleScanRequest() {
		showScanner = true;
	}
	function handleScanResult(result: string) {
		onIdChange(result);
		showScanner = false;
	}
	function handleScanClose() {
		showScanner = false;
	}
</script>

{#if inputSource === 'webrtc'}
	<ConnectionForm 
		{otherId}
		{peer}
		{connection}
		onIdChange={onIdChange}
		onConnect={onConnect}
		onScanRequest={handleScanRequest}
	/>

	<QrScanner 
		isOpen={showScanner}
		onScan={handleScanResult}
		onClose={handleScanClose}
	/>
	
	<ActionButtons 
		{connection}
		{peer}
		onDisconnect={onDisconnect}
	/>
{:else if inputSource === 'microbit'}
	<MicroBitController 
		onDataReceived={onMicroBitData}
		onConnectionChange={onMicroBitConnectionChange}
		useMock={useMockMicroBit}
	/>
{/if}
