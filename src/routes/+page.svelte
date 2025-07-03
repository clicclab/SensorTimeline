<script lang="ts">
    import { browser } from "$app/environment";
    import CollectStep from "$lib/components/CollectStep.svelte";
    import TrainStep from "$lib/components/TrainStep.svelte";
    import TestStep from "$lib/components/TestStep.svelte";
    import SessionSetup from "$lib/components/SessionSetup.svelte";
    import { getSessionById, type Session } from "$lib/session";
    import { onMount } from "svelte";
    
    // Step-based workflow state
    type Step = 'setup' | 'collect' | 'train' | 'test';
    let step: Step = $state('setup');
    let activeSession: Session | null = $state(null);

    // Sync step with query param on mount
    onMount(async () => {
        if (browser) {
            const params = new URLSearchParams(window.location.search);
            const urlStep = params.get('step');
            if (urlStep === 'collect' || urlStep === 'train' || urlStep === 'test') {
                step = urlStep;
            }
            const sessionId = localStorage.getItem('activeSessionId');
            if (sessionId) {
                const session = await getSessionById(sessionId);
                if (session) {
                    activeSession = session;
                    if (step === 'setup') step = 'collect';
                }
            } else {
                step = 'setup';
            }
        }
    });

    // Update query param when step changes
    $effect(() => {
        if (browser) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('step') !== step) {
                params.set('step', step);
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.replaceState({}, '', newUrl);
            }
        }
    });

    function handleSessionReset() {
        localStorage.removeItem('activeSessionId');
        activeSession = null;
        step = 'setup';
    }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
    <div class="max-w-2xl mx-auto">
        <div class="bg-white rounded-2xl shadow-xl p-8">
            <h1 class="text-4xl font-bold text-gray-900 mb-8 text-center">
                <span class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Sensor Timeline - Desktop Monitor
                </span>
            </h1>

            <!-- Step Content -->
            {#if step === 'setup'}
                <SessionSetup onSetupComplete={() => (step = 'collect')} />
            {:else if step === 'collect'}
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <span class="text-sm text-gray-500">Session:</span>
                        <span class="ml-2 px-2 py-1 rounded bg-gray-100 text-gray-700 font-mono">{activeSession?.id}</span>
                        <span class="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold">{activeSession?.type}</span>
                    </div>
                    <button onclick={handleSessionReset} class="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Reset Session</button>
                </div>
                {#if activeSession}
                    <CollectStep stepForward={() => (step = 'train')} session={activeSession} />
                {/if}
            {:else if step === 'train'}
                <TrainStep
                    stepBack={() => (step = 'collect')}
                    stepForward={() => (step = 'test')}
                />
            {:else if step === 'test'}
                <TestStep
                    stepBack={() => (step = 'train')}
                />
            {/if}
        </div>
        <!-- Footer -->
        <div class="mt-8 text-center">
            <p class="text-gray-600 text-sm">
                Real-time sensor data streaming with 
                <span class="text-blue-600 font-semibold">SvelteKit</span> + 
                <span class="text-blue-600 font-semibold">PeerJS</span> + 
                <span class="text-blue-600 font-semibold">Device Motion API</span> + 
                <span class="text-purple-600 font-semibold">micro:bit Bluetooth</span>
            </p>
        </div>
    </div>
</div>
