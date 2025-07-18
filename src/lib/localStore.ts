import { browser } from "$app/environment";

/**
 * A local storage wrapper using the StorageManager API (navigator.storage.getDirectory).
 * Throws if StorageManager is not available.
 */
export class LocalStore<T> {
  private constructor(public key: string, public value: T, private subscribers: Set<(value: T) => void> = new Set()) {}

  static async get<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
    if (key.length === 0) throw new Error("Key cannot be an empty string");
    if (!(browser && "storage" in navigator && "getDirectory" in navigator.storage)) {
      throw new Error(
        "StorageManager API is not available in this environment",
      );
    }

    const dir = await navigator.storage.getDirectory();
    const fileHandle = await dir.getFileHandle(key).catch(() => null);

    if (fileHandle) {
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } else {
      console.warn(`[LocalStore] File not found for key: ${key}`);
      return defaultValue;
    }
  }

  static async create<T>(key: string, initialValue: T): Promise<LocalStore<T>> {
    navigator.storage.persist().then((persistent) => {
      if (persistent) {
        console.log("Storage will not be cleared except by explicit user action");
      } else {
        console.log("Storage may be cleared by the UA under storage pressure.");
      }
    });

    if (key.length === 0) throw new Error("Key cannot be an empty string");
    const store = new LocalStore<T>(key, initialValue);
    store.key = key;
    if (
      !(browser && "storage" in navigator &&
        "getDirectory" in navigator.storage)
    ) {
      throw new Error(
        "StorageManager API is not available in this environment",
      );
    }
    
    store.value = initialValue;

    if (browser) {
      await store.init(initialValue);
    }

    return store;
  }

  private async init(initialValue: T) {
    try {
      const dir = await navigator.storage.getDirectory();
      const fileHandle = await dir.getFileHandle(this.key).catch(() => null);

      if (fileHandle) {
        const file = await fileHandle.getFile();
        const text = await file.text();
        this.value = JSON.parse(text);
        console.log(`[LocalStore] Loaded value from file:`, this.value);
      } else {
        console.log(`[LocalStore] File not found, using initial value`);
        this.value = initialValue;
      }
    } catch (e) {
      console.error(`[LocalStore] Failed to initialize:`, e);
      this.value = initialValue;
    }
  }

  subscribe(callback: (value: T) => void | Promise<void>): () => void {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Sets the value and updates storage.
   * @param newValue The new value to be set.
   */
  async set(newValue: T) {
    this.value = newValue;
    if (browser) {
      const dir = await navigator.storage.getDirectory();
      const handle = await dir.getFileHandle(this.key, { create: true });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(newValue));
      await writable.close();
      console.log(`[LocalStore] Value set and saved to file:`, newValue);
      this.subscribers.forEach(callback => {
        try {
          const result = callback(this.value);
          // Only check for Promise if result is not undefined
          if (typeof result === 'object' && result !== null && typeof (result as Promise<void>).then === 'function') {
            (result as Promise<void>).catch((e: unknown) => console.error('[LocalStore] Async subscriber error:', e));
          }
        } catch (e) {
          console.error('[LocalStore] Subscriber error:', e);
        }
      });
    }
  }

  /**
   * Gets the current value.
   * @returns The current value.
   */
  get(): T {
    return this.value;
  }
}