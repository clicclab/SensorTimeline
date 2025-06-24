import { browser } from '$app/environment';

/**
 * A simple local storage wrapper that uses $state to manage state.
 * It automatically syncs the state with localStorage.
 */
export class LocalStore<T> {
  value = $state<T>() as T;
  key = '';

  /**
   * @param key The key under which the value will be stored in localStorage.
   * @param initialValue The initial value to be stored. If the key already exists in localStorage, this value will not be overwritten.
   */
  constructor(key: string, initialValue: T) {
    if (key.length === 0) {
      throw new Error('Key cannot be an empty string');
    }

    this.key = key;

    if (browser) {
      const item = localStorage.getItem(key);
      if (item) {
        this.value = JSON.parse(item);
      } else {
        this.value = initialValue;
      }
    } else {
        this.value = initialValue;
    }

    $effect(() => {
      if (browser) {
        localStorage.setItem(this.key, JSON.stringify(this.value));
      }
    });
  }
}

export function localStore<T>(key: string, value: T) {
  return new LocalStore(key, value);
}