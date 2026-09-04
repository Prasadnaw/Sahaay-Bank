# Sahaay Bank — Android Studio Mobile Application

This is the native Android Studio project for **Sahaay Bank**, fully cross-connected with the web application and hosted on Render.

## Features
- **Cross-Platform Synchronization**: Connects to the same Render backend (`https://<your-app>.onrender.com`). Transfers, live balances, registered users, and QR codes synchronize instantly across both Web browsers and Mobile phones.
- **Hardware Camera Access**: Direct integration with Android camera for QR scanning and Biometric Face Sign-in.
- **Microphone & Voice Engine**: Speech recognition and voice banking for visually impaired users.
- **Native Haptics**: Vibration feedback for visually impaired and motor-disabled accessibility.
- **Offline Bundle & Direct Render Sync**: Bundled web assets for instantaneous launch with live REST API cross-connection.
- **In-App Server Settings**: Tap the ⚙️ icon in the top right to switch between Render Cloud, Local Emulator (`10.0.2.2:5050`), or custom host.

## How to Open in Android Studio

1. Launch **Android Studio**.
2. Click **File → Open...**
3. Browse to and select the `android` directory:
   `C:\Users\dhair\.gemini\antigravity\scratch\sahaay-bank\android`
4. Wait for Gradle to finish syncing dependencies.
5. Select an Android Emulator (Pixel 7 / Android 14) or connect a physical Android device via USB.
6. Click the green **Run (▶)** button.

## Connecting to your Render Deployment

1. Deploy your Sahaay Bank repository on Render using the included `backend/Dockerfile`.
2. Once active on Render, copy your service URL (e.g. `https://sahaay-bank.onrender.com`).
3. In the Android app, tap the **Settings (⚙️)** button on the top app bar.
4. Enter your Render URL and tap **Save & Reload App**.
5. The mobile app will now communicate directly with your live Render cloud database!
