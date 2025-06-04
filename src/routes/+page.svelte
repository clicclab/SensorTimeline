<script lang="ts">
    import { browser } from "$app/environment";
    import Peer, { type DataConnection } from "peerjs";
    import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
    import QRScanner from "$lib/components/QRScanner.svelte";
    import PeerStatus from "$lib/components/PeerStatus.svelte";
    import ConnectionForm from "$lib/components/ConnectionForm.svelte";
    import ActionButtons from "$lib/components/ActionButtons.svelte";

    let peer: Peer | null = null;
    let peerId: string | null = $state(null);
    let peerStatus: string | null = $state(null);
    let connection: DataConnection | null = null;
    let showScanner: boolean = $state(false);

    let otherId: string = $state('');

    // Event handlers
    function handleIdChange(id: string) {
        otherId = id;
    }

    function handleConnect() {
        if (peer && otherId) {
            connection = peer.connect(otherId);
        }
    }

    function handleScanRequest() {
        showScanner = true;
    }

    function handleScanResult(result: string) {
        otherId = result;
        showScanner = false;
    }

    function handleScanClose() {
        showScanner = false;
    }

    function handleSendMessage() {
        connection?.send('Hello from PeerJS!');
    }

    function handleDisconnect() {
        peer?.disconnect();
    }

    // Initialize PeerJS
    if (browser) {
        peer = new Peer();

        peer.on('open', id => {
            console.log('Peer ID:', id);
            peerStatus = 'Connected';
            peerId = id;
        });

        peer.on("connection", (conn) => {
            connection = conn;
            conn.on("data", (data) => {
                // Will print 'hi!'
                console.log(data);
            });
            conn.on("open", () => {
                conn.send("hello!");
            });
            conn.on('close', () => {
                console.log('Connection closed');
                peerStatus = 'Disconnected';
            });
            console.log('Connection established with:', conn.peer);
        });
        
        peer.on('close', () => {
            console.log('Connection closed');
            peerStatus = 'Disconnected';
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
        });
    }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
    <div class="max-w-2xl mx-auto">
        <div class="bg-white rounded-2xl shadow-xl p-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-8 text-center">
                <span class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    PeerJS Connection Hub
                </span>
            </h1>
            
            <!-- Status Section -->
            <div class="mb-8 p-6 bg-gray-50 rounded-xl">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <PeerStatus {peerId} {peerStatus} />
                    <QRCodeDisplay {peerId} />
                </div>
            </div>
            
            <!-- Connection Section -->
            <div class="space-y-6">
                <ConnectionForm 
                    {otherId}
                    {peer}
                    {connection}
                    onIdChange={handleIdChange}
                    onConnect={handleConnect}
                    onScanRequest={handleScanRequest}
                />

                <QRScanner 
                    isOpen={showScanner}
                    onScan={handleScanResult}
                    onClose={handleScanClose}
                />
                
                <ActionButtons 
                    {connection}
                    {peer}
                    onSendMessage={handleSendMessage}
                    onDisconnect={handleDisconnect}
                />
            </div>
        </div>
        
        <!-- Footer -->
        <div class="mt-8 text-center">
            <p class="text-gray-600 text-sm">
                Built with 
                <span class="text-blue-600 font-semibold">SvelteKit</span> + 
                <span class="text-blue-600 font-semibold">PeerJS</span> + 
                <span class="text-blue-600 font-semibold">Tailwind CSS</span>
            </p>
        </div>
    </div>
</div>
