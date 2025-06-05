/** Based on example from https://github.com/ngammarano/microbit-web-bluetooth */

import { browser } from "$app/environment";

/**
 * Connects to a Bluetooth device.
 * The background color shows if a Bluetooth device is connected (green) or
 * disconnected (red).
 * Allows to interact with the characteristics of the micro:bit Bluetooth
 * Accelerometer service.
 */

var bluetoothDevice: BluetoothDevice & {gatt: BluetoothRemoteGATTServer} | null = null;



/**
 * Object containing the Bluetooth UUIDs of all the services and
 * characteristics of the micro:bit.
 */
const microbitUuid = {
    /**
     * Services
     */
    genericAccess:                              ["00001800-0000-1000-8000-00805f9b34fb", "Generic Access"],
    genericAttribute:                           ["00001801-0000-1000-8000-00805f9b34fb", "Generic Attribute"],
    deviceInformation:                          ["0000180a-0000-1000-8000-00805f9b34fb", "Device Information"],
    accelerometerService:                       ["e95d0753-251d-470a-a062-fa1922dfa9a8", "Accelerometer Service"],
    magnetometerService:                        ["e95df2d8-251d-470a-a062-fa1922dfa9a8", "Magnetometer Service"],
    buttonService:                              ["e95d9882-251d-470a-a062-fa1922dfa9a8", "Button Service"],
    ioPinService:                               ["e95d127b-251d-470a-a062-fa1922dfa9a8", "IO Pin Service"],
    ledService:                                 ["e95dd91d-251d-470a-a062-fa1922dfa9a8", "LED Service"],
    eventService:                               ["e95d93af-251d-470a-a062-fa1922dfa9a8", "Event Service"],
    dfuControlService:                          ["e95d93b0-251d-470a-a062-fa1922dfa9a8", "DFU Control Service"],
    temperatureService:                         ["e95d6100-251d-470a-a062-fa1922dfa9a8", "Temperature Service"],
    uartService:                                ["6e400001-b5a3-f393-e0a9-e50e24dcca9e", "UART Service"],
    /**
     * Characteristics
     */
    deviceName:                                 ["00002a00-0000-1000-8000-00805f9b34fb", "Device Name"],
    appearance:                                 ["00002a01-0000-1000-8000-00805f9b34fb", "Appearance"],
    peripheralPreferredConnectionParameters:    ["00002a04-0000-1000-8000-00805f9b34fb", "Peripheral Preferred Connection Parameters"],
    serviceChanged:                             ["00002a05-0000-1000-8000-00805f9b34fb", "Service Changed"],
    modelNumberString:                          ["00002a24-0000-1000-8000-00805f9b34fb", "Model Number String"],
    serialNumberString:                         ["00002a25-0000-1000-8000-00805f9b34fb", "Serial Number String"],
    hardwareRevisionString:                     ["00002a27-0000-1000-8000-00805f9b34fb", "Hardware Revision String"],
    firmwareRevisionString:                     ["00002a26-0000-1000-8000-00805f9b34fb", "Firmware Revision String"],
    manufacturerNameString:                     ["00002a29-0000-1000-8000-00805f9b34fb", "Manufacturer Name String"],
    accelerometerData:                          ["e95dca4b-251d-470a-a062-fa1922dfa9a8", "Accelerometer Data"],
    accelerometerPeriod:                        ["e95dfb24-251d-470a-a062-fa1922dfa9a8", "Accelerometer Period"],
    magnetometerData:                           ["e95dfb11-251d-470a-a062-fa1922dfa9a8", "Magnetometer Data"],
    magnetometerPeriod:                         ["e95d386c-251d-470a-a062-fa1922dfa9a8", "Magnetometer Period"],
    magnetometerBearing:                        ["e95d9715-251d-470a-a062-fa1922dfa9a8", "Magnetometer Bearing"],
    magnetometerCalibration:                    ["e95db358-251d-470a-a062-fa1922dfa9a8", "Magnetometer Calibration"],
    buttonAState:                               ["e95dda90-251d-470a-a062-fa1922dfa9a8", "Button A State"],
    buttonBState:                               ["e95dda91-251d-470a-a062-fa1922dfa9a8", "Button B State"],
    pinData:                                    ["e95d8d00-251d-470a-a062-fa1922dfa9a8", "Pin Data"],
    pinADConfiguration:                         ["e95d5899-251d-470a-a062-fa1922dfa9a8", "Pin AD Configuration"],
    pinIOConfiguration:                         ["e95db9fe-251d-470a-a062-fa1922dfa9a8", "Pin IO Configuration"],
    pwmControl:                                 ["e95dd822-251d-470a-a062-fa1922dfa9a8", "PWM Control"],
    ledMatrixState:                             ["e95d7b77-251d-470a-a062-fa1922dfa9a8", "LED Matrix State"],
    ledText:                                    ["e95d93ee-251d-470a-a062-fa1922dfa9a8", "LED Text"],
    scrollingDelay:                             ["e95d0d2d-251d-470a-a062-fa1922dfa9a8", "Scrolling Delay"],
    microbitRequirements:                       ["e95db84c-251d-470a-a062-fa1922dfa9a8", "MicroBit Requirements"],
    microbitEvent:                              ["e95d9775-251d-470a-a062-fa1922dfa9a8", "MicroBit Event"],
    clientRequirements:                         ["e95d23c4-251d-470a-a062-fa1922dfa9a8", "Client Requirements"],
    clientEvent:                                ["e95d5404-251d-470a-a062-fa1922dfa9a8", "Client Event"],
    dfuControl:                                 ["e95d93b1-251d-470a-a062-fa1922dfa9a8", "DFU Control"],
    temperature:                                ["e95d9250-251d-470a-a062-fa1922dfa9a8", "Temperature"],
    temperaturePeriod:                          ["e95d1b25-251d-470a-a062-fa1922dfa9a8", "Temperature Period"],
    txCharacteristic:                           ["6e400002-b5a3-f393-e0a9-e50e24dcca9e", "Tx Characteristic"],
    rxCharacteristic:                           ["6e400003-b5a3-f393-e0a9-e50e24dcca9e", "Rx Characteristic"],
}

/**
 * Function that turns the background color red.
 */
function onDisconnected() {
    console.log("Device disconnected.");
}

var accelerometerDataCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
var accelerometerPeriodCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

/**
 * Function that updates the HTML element according to the accelerometer data
 * characteristic.
 */
function accelerometerDataChanged(event: Event): [number, number, number] {
    if (!event.target){
        console.error("Event target is null or undefined.");
        return [0, 0, 0]; // Default values if no event target
    }

    let dataCharacteristic = event.target as BluetoothRemoteGATTCharacteristic;

    if (!dataCharacteristic.value) {
        console.error("Data characteristic value is null or undefined.");
        return [0, 0, 0]; // Default values if no value
    }
    if (dataCharacteristic.value.byteLength < 6) {
        console.error("Data characteristic value is too short.");
        return [0, 0, 0]; // Default values if value is too short
    }

    let accelerometerX = dataCharacteristic.value.getInt16(0, true); // Little Endian
    let accelerometerY = dataCharacteristic.value.getInt16(2, true); // Little Endian
    let accelerometerZ = dataCharacteristic.value.getInt16(4, true); // Little Endian
    return [accelerometerX, accelerometerY, accelerometerZ];
}

/**
 * Function that updates the HTML number input according to the accelerometer
 * period given by the Bluetooth characteristic.
 */
function readAccelerometerPeriod() : Promise<number> {
    console.log("Reading accelerometer period... ");
    if (!bluetoothDevice) {
        console.error("There is no device connected.");
    } else {
        if (bluetoothDevice.gatt.connected) {
            if (!accelerometerPeriodCharacteristic) {
                console.error("There is no Accelerometer Period characteristic.");
            } else {
                return accelerometerPeriodCharacteristic.readValue()
                .then(value => {
                    return value.getUint16(0, true); // Little Endian
                })
                .catch(error => {
                    console.error(error);
                    return 0; // Default value if error occurs
                });
            };
        } else {
            console.error("There is no device connected.");
        };
    };

    return Promise.resolve(0); // Default value if no device is connected
}

/**
 * Function that updates the accelerometer period using the corresponding
 * micro:bit Bluetooth characteristic.
 */
function writeAccelerometerPeriod(value: number) {
    console.log("Writing accelerometer period... ");
    if (!bluetoothDevice) {
        console.error("There is no device connected.");
    } else {
        if (bluetoothDevice.gatt.connected) {
            if (!accelerometerPeriodCharacteristic) {
                console.error("There is no Accelerometer Period characteristic.");
            } else {
                let buffer = new ArrayBuffer(2);
                let accelerometerPeriod = new DataView(buffer);
                accelerometerPeriod.setUint16(0, value, true); // Little Endian
                accelerometerPeriodCharacteristic.writeValue(accelerometerPeriod)
                .then(_ => {
                    
                })
                .catch(error => {
                    console.error(error);
                });
            };
        } else {
            console.error("There is no device connected.");
        };
    };
}


/**
 * Function that connects to a Bluetooth device, and saves the characteristics
 * associated with the Accelerometer service.
 */
function connect() {
    if(!browser) {
        console.error("This function is only available in the browser.");
        return;
    }

    console.log("Requesting micro:bit Bluetooth devices... ");
    if (!navigator.bluetooth) {
        console.error("Bluetooth not available in this browser or computer.");
    } else {
        navigator.bluetooth.requestDevice({
            // To accept all devices, use acceptAllDevices: true and remove filters.
            filters: [{namePrefix: "BBC micro:bit"}],
            optionalServices: [microbitUuid.genericAccess[0], microbitUuid.genericAttribute[0], microbitUuid.deviceInformation[0], microbitUuid.accelerometerService[0], microbitUuid.magnetometerService[0], microbitUuid.buttonService[0], microbitUuid.ioPinService[0], microbitUuid.ledService[0], microbitUuid.eventService[0], microbitUuid.dfuControlService[0], microbitUuid.temperatureService[0], microbitUuid.uartService[0]],
        })
        .then(device => {
            if (!device.gatt) {
                console.error("The device does not support GATT.");
                return;
            }

            bluetoothDevice = device as BluetoothDevice & {gatt: BluetoothRemoteGATTServer};
            console.log("Connecting to GATT server (name: " + device.name + ", ID: " + device.id + ")... ");
            device.addEventListener('gattserverdisconnected', onDisconnected);
            return device.gatt?.connect();
        })
        .then(server => {
            console.log("Getting Accelerometer service (UUID: " + microbitUuid.accelerometerService[0] + ")... ");
            return server?.getPrimaryService(microbitUuid.accelerometerService[0]);
        })
        .then(service => {
            console.log("Getting Accelerometer data characteristic... ");
            service?.getCharacteristic(microbitUuid.accelerometerData[0])
            .then(dataChar => {
                accelerometerDataCharacteristic = dataChar;
                console.log("Starting accelerometer data notifications... ");
                return dataChar.startNotifications()
                .then(_ => {
                    dataChar.addEventListener('characteristicvaluechanged', accelerometerDataChanged);
                    console.log("Getting Accelerometer period characteristic... ");
                    service.getCharacteristic(microbitUuid.accelerometerPeriod[0])
                    .then(periodChar => {
                        accelerometerPeriodCharacteristic = periodChar;
                        
                    })
                    .catch(error => {
                        console.error(error);
                    });
                })
                .catch(error => {
                    console.error(error);
                });
            })
            .catch(error => {
                console.error(error);
            });
        })
        .catch(error => {
            console.error(error);
        });
    };
}



/**
 * Function that disconnects from the Bluetooth device (if connected).
 */
function disconnect() {
    console.log("Disconnecting... ");
    if (!bluetoothDevice) {
        console.error("There is no device connected.");
    } else {
        if (bluetoothDevice.gatt.connected) {
            bluetoothDevice.gatt.disconnect();
            if (!bluetoothDevice.gatt.connected) {
                console.error("Not connected.");
            };
        } else {
            console.error("There is no device connected.");
        };
    };
}