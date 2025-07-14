<script lang="ts">
    import { browser } from "$app/environment";
import CollectStep from "$lib/components/CollectStep.svelte";
import TrainStep from "$lib/components/TrainStep.svelte";
import TestStep from "$lib/components/TestStep.svelte";
import ExportStep from "$lib/components/ExportStep.svelte";
import SessionSetup from "$lib/components/SessionSetup.svelte";
import SessionInfoHeader from "$lib/components/SessionInfoHeader.svelte";
    import { getSessionById, type Session } from "$lib/session";
    import { onMount } from "svelte";
    
    // Step-based workflow state
type Step = 'setup' | 'collect' | 'train' | 'test' | 'export';
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
                <SessionSetup onSetupComplete={(session) => {
                    activeSession = session; 
                    step = 'collect';
                }} />
            {:else if step === 'collect'}
                {#if activeSession}
                    <SessionInfoHeader session={activeSession} onReset={handleSessionReset} />
                    <CollectStep stepForward={() => (step = 'train')} session={activeSession} />
                {/if}
            {:else if step === 'train'}
                {#if activeSession}
                    <SessionInfoHeader session={activeSession} onReset={handleSessionReset} />
                    <TrainStep
                        stepBack={() => (step = 'collect')}
                        stepForward={() => (step = 'test')}
                        session={activeSession}
                    />
                {/if}
            {:else if step === 'test'}
                {#if activeSession}
                    <SessionInfoHeader session={activeSession} onReset={handleSessionReset} />
                    <TestStep
                        stepBack={() => (step = 'train')}
                        onExport={() => (step = 'export')}
                        session={activeSession}
                    />
                {/if}
            {:else if step === 'export'}
                {#if activeSession}
                    <SessionInfoHeader session={activeSession} onReset={handleSessionReset} />
                    <ExportStep
                        stepBack={() => (step = 'test')}
                        session={activeSession}
                    />
                {/if}
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
