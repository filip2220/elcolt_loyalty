# 🔔 Firebase Push Notifications Setup Guide

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the El Colt Loyalty App.

## Prerequisites

- A Google account
- Access to the [Firebase Console](https://console.firebase.google.com/)
- For iOS: Apple Developer Account and Xcode

---

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `El Colt Loyalty`
4. Enable/disable Google Analytics as desired
5. Click **"Create project"**

---

## Step 2: Add Android App

1. In the Firebase Console, click **"Add app"** → **Android**
2. Enter package name: `com.elcolt.loyalty`
3. Enter app nickname: `El Colt Loyalty Android`
4. (Optional) Enter SHA-1 signing certificate for Google Sign-In
5. Click **"Register app"**
6. Download `google-services.json`
7. Place the file in: `android/app/google-services.json`

### Update Android Build Files

Add to `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

Add to `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

---

## Step 3: Add iOS App

1. In the Firebase Console, click **"Add app"** → **iOS**
2. Enter bundle ID: `com.elcolt.loyalty`
3. Enter app nickname: `El Colt Loyalty iOS`
4. (Optional) Enter App Store ID
5. Click **"Register app"**
6. Download `GoogleService-Info.plist`
7. Place the file in: `ios/App/App/GoogleService-Info.plist`

### Add to Xcode

1. Open `ios/App/App.xcworkspace` in Xcode
2. Right-click on `App` folder → **"Add Files to App"**
3. Select `GoogleService-Info.plist`
4. Ensure "Copy items if needed" is checked
5. Click **"Add"**

---

## Step 4: Configure iOS Push Notifications

### Create APNs Key

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Keys** → **+**
4. Enter key name: `El Colt Push Key`
5. Check **Apple Push Notifications service (APNs)**
6. Click **Continue** → **Register**
7. Download the `.p8` file (save it securely - you can only download once!)
8. Note the **Key ID**

### Upload to Firebase

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Under **Apple app configuration**, click **Upload** for APNs Authentication Key
3. Upload your `.p8` file
4. Enter the **Key ID** and **Team ID** (found in Apple Developer Portal)

### Enable in Xcode

1. Open the iOS project in Xcode
2. Select your project target
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Add **Push Notifications**
6. Add **Background Modes** → Check **Remote notifications**

---

## Step 5: Backend Configuration (Optional)

To send push notifications from the backend, install Firebase Admin SDK:

```bash
cd backend
npm install firebase-admin
```

Create `backend/firebaseConfig.js`:
```javascript
const admin = require('firebase-admin');

// Download from Firebase Console → Project Settings → Service Accounts
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
```

**⚠️ IMPORTANT:** Add `firebase-service-account.json` to `.gitignore`:
```
backend/firebase-service-account.json
```

### Send Notification Example

```javascript
const admin = require('./firebaseConfig');

const sendPushNotification = async (tokens, title, body, data = {}) => {
  const message = {
    notification: { title, body },
    data,
    tokens
  };
  
  const response = await admin.messaging().sendEachForMulticast(message);
  console.log(`${response.successCount} messages sent successfully`);
  return response;
};
```

---

## Step 6: Sync and Build

After adding Firebase files:

```bash
# Sync web app to native platforms
npm run cap:sync

# Build for Android
npm run cap:android
# Then build/run from Android Studio

# Build for iOS
npm run cap:ios
# Then build/run from Xcode
```

---

## Testing Push Notifications

### Using Firebase Console

1. Go to Firebase Console → **Messaging**
2. Click **"Create your first campaign"**
3. Choose **"Firebase Notification messages"**
4. Enter title and text
5. Click **"Send test message"**
6. Enter a device token (visible in app logs after registration)
7. Click **"Test"**

### Using cURL

```bash
# Replace <SERVER_KEY> and <DEVICE_TOKEN>
curl -X POST \
  -H "Authorization: key=<SERVER_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "<DEVICE_TOKEN>",
    "notification": {
      "title": "Test",
      "body": "Hello from El Colt!"
    }
  }' \
  https://fcm.googleapis.com/fcm/send
```

---

## Checklist

- [ ] Firebase project created
- [ ] Android app added to Firebase
- [ ] `google-services.json` added to `android/app/`
- [ ] Android build.gradle files updated
- [ ] iOS app added to Firebase
- [ ] `GoogleService-Info.plist` added to `ios/App/App/`
- [ ] APNs key created and uploaded to Firebase
- [ ] Push Notifications capability enabled in Xcode
- [ ] Background Modes enabled in Xcode
- [ ] (Optional) Firebase Admin SDK installed on backend
- [ ] (Optional) Service account JSON added to backend

---

## Troubleshooting

### Android: Not receiving notifications

1. Ensure `google-services.json` is in the correct location
2. Check that the package name matches exactly
3. Verify the app is not in battery optimization mode
4. Check logcat for FCM errors

### iOS: Not receiving notifications

1. Ensure APNs key is uploaded to Firebase
2. Verify bundle ID matches
3. Check that Push Notifications capability is enabled
4. Test on a real device (simulators cannot receive push)
5. Ensure the app is properly signed

### Both: Token not registering

1. Check console logs for registration errors
2. Verify Firebase configuration files are valid JSON/plist
3. Ensure Capacitor plugins are synced: `npm run cap:sync`

---

## Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)
