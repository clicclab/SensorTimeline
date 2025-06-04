<script lang="ts">
    import { browser } from "$app/environment";
    import Peer, { type DataConnection } from "peerjs";
    import QRCodeDisplay from "$lib/components/QRCodeDisplay.svelte";
    import QRScanner from "$lib/components/QRScanner.svelte";
    import PeerStatus from "$lib/components/PeerStatus.svelte";
    import ConnectionForm from "$lib/components/ConnectionForm.svelte";
    import ActionButtons from "$lib/components/ActionButtons.svelte";

    let peer: Peer | null = $state.raw(null);
    let peerId: string | null = $state(null);
    let peerStatus: string | null = $state(null);
    let connection: DataConnection | null = $state.raw(null);
    let showScanner: boolean = $state(false);

    let otherId: string = $state('');

    // Debug effect to track connection state
    $effect(() => {
        console.log('Main page - connection state changed:', {
            connection: !!connection,
            connectionOpen: connection?.open,
            peerId,
            peerStatus,
            otherId
        });
    });

    // Event handlers
    function handleIdChange(id: string) {
        otherId = id;
    }

    function handleConnect() {
        if (peer && otherId) {
            console.log('Attempting to connect to:', otherId);
            const conn = peer.connect(otherId);
            
            conn.on('open', () => {
                console.log('Outgoing connection opened to:', conn.peer);
                console.log('Connection object:', conn);
                connection = conn;
            });
            
            conn.on('data', (data) => {
                console.log('Received data:', data);
            });
            
            conn.on('close', () => {
                console.log('Outgoing connection closed');
                connection = null;
            });
            
            conn.on('error', (err) => {
                console.error('Connection error:', err);
            });
        } else {
            console.log('Cannot connect: peer or otherId missing', { peer: !!peer, otherId });
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
        console.log('Attempting to send message, connection state:', {
            connection: !!connection,
            connectionOpen: connection?.open,
            connectionType: connection?.type
        });
        
        if (connection) {
            try {
                connection.send('Hello from PeerJS!');
                console.log('Message sent: Hello from PeerJS!');
            } catch (error) {
                console.error('Error sending message:', error);
            }
        } else {
            console.log('Cannot send message: no connection');
        }
    }

    function handleDisconnect() {
        console.log('Desktop: Disconnecting...');
        
        if (connection) {
            connection.close();
            connection = null;
        }
        
        // Note: Don't disconnect the peer entirely, just close the connection
        // This allows for reconnection without reinitializing the peer
        console.log('Desktop: Disconnected, ready for new connections');
    }

    // Initialize PeerJS
    if (browser) {
        const newPeer = new Peer();
        peer = newPeer;

        newPeer.on('open', id => {
            console.log('Peer ID:', id);
            peerStatus = 'Connected';
            peerId = id;
        });

        newPeer.on("connection", (conn) => {
            console.log('Incoming connection from:', conn.peer);
            connection = conn;
            
            conn.on("data", (data) => {
                console.log('Received data:', data);
            });
            
            conn.on("open", () => {
                console.log('Incoming connection opened with:', conn.peer);
                conn.send("hello!");
            });
            
            conn.on('close', () => {
                console.log('Incoming connection closed');
                connection = null;
            });
            
            conn.on('error', (err) => {
                console.error('Incoming connection error:', err);
            });
        });
        
        newPeer.on('close', () => {
            console.log('Connection closed');
            peerStatus = 'Disconnected';
        });

        newPeer.on('error', (err) => {
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
