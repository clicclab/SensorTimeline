# Sensor Timeline
This repository contains a small Svelte project that allows for connecting a mobile phone or micro:bit to a computer and displaying the sensor data.

## Features
- Real-time accelerometer data streaming from a mobile device or micro:bit
- WebRTC-based peer connection for mobile devices
- Webcam recording with synchronized sensor data playback
- Timeline view for reviewing recordings
- QR code scanning for easy peer connection to mobile devices
- User-friendly interface built with Svelte

## Getting Started
To get started with the project, clone the repository and install the dependencies:

```bash
git clone https://github.com/gsteinLTU/SensorTimeline.git
cd SensorTimeline
npm install
```

## Running the Project
To run the project in development mode, use the following command:

```bash
npm run dev
```

This will start a local development server.

### Desktop Interface
Navigate to the app in your browser. 
The GitHub Pages deployment is available at [https://gsteinltu.github.io/SensorTimeline/](https://gsteinltu.github.io/SensorTimeline/).
If you are hosting the app locally, it will typically be available at [http://localhost:5173](http://localhost:5173).

The desktop interface provides two input source options:

#### micro:bit (Default)
1. Select "micro:bit" as your input source (selected by default)
2. Click "Connect to micro:bit" to establish a Bluetooth LE connection
3. Your micro:bit should be running code that advertises accelerometer data via Bluetooth
4. Once connected, real-time accelerometer data will be displayed with live charts

#### Mobile Device (WebRTC)
1. Select "Mobile Device" as your input source
2. You will see a QR code that you can scan from the mobile page
3. The mobile page is available at [https://gsteinltu.github.io/SensorTimeline/mobile](https://gsteinltu.github.io/SensorTimeline/mobile)
   - If you are running the app locally, use [http://localhost:5173/mobile](http://localhost:5173/mobile)
4. Scan the QR code or manually enter the peer ID to establish connection
5. Once connected, the app will display real-time sensor data from your mobile device

### Recording & Playback
- Use the webcam recorder to capture video synchronized with sensor data
- Review recordings with timeline-aligned playback
- Delete unwanted recordings from the recordings list

### Mobile Access
Getting the mobile page accessible from your phone can be challenging when developing locally. Consider using tools like [localtunnel](https://localtunnel.github.io/www/) to expose your local server:

```bash
npx localtunnel --port 5173
```

## micro:bit Setup

To use the micro:bit functionality, your micro:bit device needs to be programmed to advertise accelerometer data via Bluetooth LE. The application expects the micro:bit to:

1. Enable Bluetooth LE advertising
2. Broadcast accelerometer data (X, Y, Z values) 
3. Use the standard micro:bit Bluetooth accelerometer service
4. Provide data in milli-g units (automatically converted to m/s² by the application)

You can use [MakeCode](https://makecode.microbit.org/) or [MicroPython](https://microbit-micropython.readthedocs.io/) to program your micro:bit with the appropriate Bluetooth accelerometer broadcasting code.

## License
This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.