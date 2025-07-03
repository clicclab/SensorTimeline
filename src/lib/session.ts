import { LocalStore } from "./localStore.ts";
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

export async function saveSession(session: Session) {
  const store = await loadSessionStore();
  const sessions = store.get();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx !== -1) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  await store.set(sessions);
}

export async function getSessions(): Promise<Session[]> {
  const store = await loadSessionStore();
  return store.get();
}

export async function getSessionById(id: string): Promise<Session | undefined> {
  const sessions = await getSessions();
  return sessions.find(s => s.id === id);
}
