import { browser } from "$app/environment";

/**
 * A local storage wrapper using the StorageManager API (navigator.storage.getDirectory).
 * Throws if StorageManager is not available.
 */
export class LocalStore<T> {
  private constructor(public key: string, public value: T) {}

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