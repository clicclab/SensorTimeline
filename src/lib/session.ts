import { LocalStore } from "./localStore.ts";
import { blobToBase64, base64ToBlob } from './blobUtils.ts';
import type { Recording } from "./types.ts";

export type SessionType = "accelerometer" | "pose";

export type Session = {
  id: string;
  type: SessionType;
  createdAt: number;
  recordings: Recording[];
  classes: string[]; // List of classes for the session
  // Add more metadata as needed
};

export function createSession(type: SessionType, classes: string[] = ['Class 1', 'Class 2']): Session {
  return {
    id: `session-${Date.now()}`,
    type,
    createdAt: Date.now(),
    recordings: [],
    classes,
  };
}

export let sessionStore: LocalStore<Session[]> | null = null;

export async function loadSessionStore(): Promise<LocalStore<Session[]>> {
    if (sessionStore) {
        return sessionStore; // Already initialized
    }

    // All sessions are stored as an array under this key
    sessionStore = await LocalStore.create<Session[]>("sessions", []);
    return sessionStore;
}

type StorageRecording = Omit<Recording, 'videoBlob'> & { videoBase64?: string };
type StorageSession = Omit<Session, 'recordings'> & { recordings: StorageRecording[] };

// Helper to prepare recordings for saving (encode videoBlob)
async function prepareSessionForSave(session: Session): Promise<StorageSession> {
  const newRecordings: StorageRecording[] = await Promise.all(session.recordings.map(async (rec) => {
    if (rec.videoBlob && !(rec as StorageRecording).videoBase64) {
      const base64 = await blobToBase64(rec.videoBlob);
      // Remove videoBlob for storage, add base64
      const { videoBlob: _videoBlob, ...rest } = rec;
      return { ...rest, videoBase64: base64 };
    }
    const { videoBlob: _videoBlob, ...rest } = rec;
    return { ...rest };
  }));
  return { ...session, recordings: newRecordings };
}

// Helper to reconstruct videoBlob from base64 after loading
function reconstructSessionBlobs(session: StorageSession): Session {
  const newRecordings: Recording[] = session.recordings.map((rec) => {
    if (rec.videoBase64) {
      // Try to infer mime type from base64 string
      const mimeMatch = rec.videoBase64.match(/^data:(.*?);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'video/webm';
      const videoBlob = base64ToBlob(rec.videoBase64, mimeType);
      return { ...rec, videoBlob } as Recording;
    }
    // If no videoBase64, create a dummy Blob to satisfy type (will not play)
    return { ...rec, videoBlob: new Blob() } as Recording;
  });
  return { ...session, recordings: newRecordings };
}

export async function saveSession(session: Session) {
  const store = await loadSessionStore();
  const sessions = store.get() as unknown as StorageSession[];
  const idx = sessions.findIndex(s => s.id === session.id);
  const sessionToSave = await prepareSessionForSave(session);
  if (idx !== -1) {
    sessions[idx] = sessionToSave;
  } else {
    sessions.push(sessionToSave);
  }
  await store.set(sessions as unknown as Session[]);
  console.log("Session saved:", sessionToSave);
}

export async function getSessions(): Promise<Session[]> {
  const store = await loadSessionStore();
  const sessions = store.get() as unknown as StorageSession[];
  // Reconstruct blobs for all sessions
  return sessions.map(reconstructSessionBlobs);
}

export async function getSessionById(id: string): Promise<Session | undefined> {
  const sessions = await getSessions();
  return sessions.find(s => s.id === id);
}
