# Sensor Timeline
This repository contains a small Svelte project that allows for connecting a mobile phone to a computer and displaying the sensor data.

## Features
- Real-time accelerometer data streaming from mobile to desktop
- QR code scanning for easy peer connection
- User-friendly interface built with Svelte

## Getting Started
To get started with the project, clone the repository and install the dependencies:

```bash
git clone https://github.com/yourusername/sensor-timeline.git
cd sensor-timeline
npm install
```

## Running the Project
To run the project in development mode, use the following command:

```bash
npm run dev
```

This will start a local development server and open the app in your default browser.

## Using the App

Navigate to the app in your browser. If you are hosting the app localhost, it will typically be available at `http://localhost:5173`. The mobile page would then be available at `http://localhost:5173/mobile`.

You will see a QR code that you can scan with your mobile device to connect. Once connected, the app will display real-time sensor data from your mobile device.

## License
This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.