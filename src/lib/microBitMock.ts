// Mocked micro:bit module for testing purposes
// Simulates accelerometer data as a sinusoidal pattern

let intervalId: ReturnType<typeof setInterval> | null = null;
let isConnectedFlag = false;
let period = 100; // ms
let deviceName = "Mock micro:bit";
let onAccelerometerDataCallback: ((x: number, y: number, z: number) => void) | null = null;
let onDisconnectedCallback: (() => void) | null = null;
let onConnectedCallback: (() => void) | null = null;
let t = 0;

function connect(): Promise<void> {
    return new Promise((resolve) => {
        isConnectedFlag = true;
        if (onConnectedCallback) onConnectedCallback();
        t = 0;
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
            if (onAccelerometerDataCallback) {
                // Simulate a 1Hz sine wave for X, cosine for Y, and zero for Z
                const x = Math.round(1000 * Math.sin(2 * Math.PI * t / 100));
                const y = Math.round(1000 * Math.cos(2 * Math.PI * t / 100));
                const z = 0;
                onAccelerometerDataCallback(x, y, z);
                t = (t + 1) % 100;
            }
        }, period);
        resolve();
    });
}

function disconnect() {
    isConnectedFlag = false;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    if (onDisconnectedCallback) onDisconnectedCallback();
}

function readAccelerometerPeriod(): Promise<number> {
    return Promise.resolve(period);
}

function writeAccelerometerPeriod(value: number) {
    period = value;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = setInterval(() => {
            if (onAccelerometerDataCallback) {
                const x = Math.round(1000 * Math.sin(2 * Math.PI * t / 100));
                const y = Math.round(1000 * Math.cos(2 * Math.PI * t / 100));
                const z = 0;
                onAccelerometerDataCallback(x, y, z);
                t = (t + 1) % 100;
            }
        }, period);
    }
}

export function setAccelerometerDataCallback(callback: (x: number, y: number, z: number) => void) {
    onAccelerometerDataCallback = callback;
}

export function setDisconnectedCallback(callback: () => void) {
    onDisconnectedCallback = callback;
}

export function setConnectedCallback(callback: () => void) {
    onConnectedCallback = callback;
}

export function isConnected(): boolean {
    return isConnectedFlag;
}

export function getDeviceName(): string | null {
    return isConnectedFlag ? deviceName : null;
}

export { connect, disconnect, readAccelerometerPeriod, writeAccelerometerPeriod };