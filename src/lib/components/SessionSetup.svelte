<script lang="ts">
import type { SessionType, Session } from "$lib/session";
import { createSession, saveSession } from "$lib/session";
import { goto } from "$app/navigation";

let sessionType: SessionType | null = $state(null);
let classInput = $state("");
let classes: string[] = $state(["Class 1", "Class 2"]);
let error = $state("");

type Props = {
    onSetupComplete?: (session: Session) => void;
};

let { onSetupComplete }: Props = $props();

function handleAddClass() {
  const trimmed = classInput.trim();
  if (
    trimmed &&
    !classes.includes(trimmed) &&
    classes.length < 5
  ) {
    classes = [...classes, trimmed];
    classInput = "";
  }
}

function handleRemoveClass(idx: number) {
  if (classes.length > 2) {
    classes = classes.filter((_, i) => i !== idx);
  }
}

async function handleStartSession() {
  if (!sessionType) {
    error = "Please select a data type.";
    return;
  }
  if (classes.length < 2) {
    error = "Please define at least two classes.";
    return;
  }
  const session: Session = createSession(sessionType, classes);
  await saveSession(session);
  // Redirect or emit event to continue to collection step with this session
  // For now, store session id in localStorage and reload
  localStorage.setItem("activeSessionId", session.id);
  onSetupComplete?.(session);
}
</script>

<div class="max-w-lg mx-auto bg-white rounded-xl shadow p-8 mt-8">
  <h2 class="text-2xl font-bold mb-4">Start a New Session</h2>
  <div class="mb-6">
    <label class="block font-medium mb-2">Data Type</label>
    <div class="flex gap-4 flex-col">
      <button 
        type="button" onclick={() => (sessionType = 'accelerometer')} 
        class="px-4 py-2 rounded text-white font-semibold focus:ring-2 focus:ring-blue-400 border-blue-800 {sessionType === 'accelerometer' ? 'bg-blue-600' : 'bg-blue-200'}"
        aria-pressed={sessionType === 'accelerometer'}>
        <div class="{sessionType !== 'accelerometer' ? 'text-gray-800' : 'text-white'} flex items-center gap-2">
            Accelerometer
        </div>
      </button>
      <button type="button" onclick={() => (sessionType = 'pose')} 
        class="px-4 py-2 rounded font-semibold focus:ring-2 focus:ring-green-400 border-green-800 {sessionType === 'pose' ? 'bg-green-600' : 'bg-green-200'}"
        aria-pressed={sessionType === 'pose'}>
        <div class="{sessionType !== 'pose' ? 'text-gray-800' : 'text-white'} flex items-center gap-2">
            Pose
        </div>
      </button>
    </div>
  </div>
  <div class="mb-6">
    <label class="block font-medium mb-2">Classes</label>
    <div class="flex gap-2 mb-2">
      <input type="text" bind:value={classInput} placeholder="Add class name..." class="flex-1 px-3 py-2 border rounded" maxlength={32} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddClass(); }}} />
      <button type="button" onclick={handleAddClass} class="px-3 py-2 bg-gray-200 rounded" disabled={classes.length >= 5 || !classInput.trim()}>Add</button>
    </div>
    <div class="flex flex-wrap gap-2">
      {#each classes as c, i}
        <span class="px-2 py-1 bg-gray-100 rounded text-sm flex items-center gap-1">
          {c}
          {#if classes.length > 2}
            <button type="button" onclick={() => handleRemoveClass(i)} class="ml-1 text-xs text-red-500 hover:text-red-700" aria-label="Remove class">&times;</button>
          {/if}
        </span>
      {/each}
    </div>
    <div class="text-xs text-gray-500 mt-1">{classes.length}/5 classes</div>
  </div>
  {#if error}
    <div class="mb-4 text-red-600">{error}</div>
  {/if}
  <button type="button" 
    onclick={handleStartSession} 
    class="w-full py-3 rounded bg-primary text-black font-bold text-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-primary-800 focus:ring-2 focus:ring-blue-400 transition-colors"
    disabled={classes.length < 2 || !sessionType}>Start Session</button>
</div>
