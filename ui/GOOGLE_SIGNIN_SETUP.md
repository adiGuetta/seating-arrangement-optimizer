# Google Sign-In on Mobile — Setup Guide

## What Changed and Why

The old approach used `expo-auth-session` with `useIdTokenAuthRequest` and the Expo auth proxy
(`https://auth.expo.io/@heng159/seating-planner`). This had multiple problems:

1. **Expo auth proxy is deprecated** — Expo removed the hosted proxy; the redirect URL no longer works.
2. **React hooks violation** — `useIdTokenAuthRequest` was called inside a conditional `require()` block, which breaks the rules of hooks and causes crashes on native.
3. **Missing native config** — `app.json` had no `android`/`ios` sections, so no native OAuth could work.

The new approach uses **`@react-native-google-signin/google-signin`**, which is the standard library
for Google Sign-In in React Native / Expo. It uses the native Google Sign-In SDKs (no browser redirect),
and is an Expo config plugin so it wires itself automatically at build time.

**Web is unchanged** — still uses Firebase `signInWithPopup`, which already works.

### Files Modified

| File | Change |
|------|--------|
| `lib/auth.tsx` | Replaced `expo-auth-session` flow with `@react-native-google-signin/google-signin` |
| `lib/firebase.ts` | Removed unused `GoogleAuthProvider` export |
| `package.json` | Removed `expo-auth-session` + `expo-web-browser`, added `@react-native-google-signin/google-signin` |
| `app.json` | Added `android`/`ios` config sections, added google-signin plugin |

---

## Firebase Console Setup

Go to [Firebase Console](https://console.firebase.google.com) → your project (`wedding-seating-75c25`).

### 1. Add Android App (if not already added)

1. **Project Settings → General → Add app → Android**
2. Package name: `com.seatingplanner.app` (must match `app.json` → `android.package`)
3. Download `google-services.json`
4. Place it at: `ui/google-services.json`

### 2. Add iOS App (if not already added)

1. **Project Settings → General → Add app → iOS**
2. Bundle ID: `com.seatingplanner.app` (must match `app.json` → `ios.bundleIdentifier`)
3. Download `GoogleService-Info.plist`
4. Place it at: `ui/GoogleService-Info.plist`

### 3. Enable Google Sign-In Provider

1. **Authentication → Sign-in method → Google → Enable**
2. This should already be done since web login works, but verify it.

### 4. Add SHA-1 Fingerprint (Android only)

This is required for Google Sign-In on Android.

**For debug builds (Expo dev client):**
```bash
cd ui
npx expo prebuild --platform android
cd android
./gradlew signingReport
```
Copy the `SHA1` from the `debug` variant, then:

1. **Firebase Console → Project Settings → General → Your Android app**
2. Click "Add fingerprint" and paste the SHA-1

---

## Google Cloud Console Setup

Go to [Google Cloud Console](https://console.cloud.google.com) → select the Firebase project.

### Verify OAuth Client IDs

Go to **APIs & Services → Credentials**. You should see these OAuth 2.0 Client IDs
(Firebase auto-creates the Web one; Android/iOS may need manual creation):

| Type | Purpose |
|------|---------|
| **Web client** | Used by Firebase Auth on web AND as `serverClientId` for native |
| **Android** | Must have package name `com.seatingplanner.app` + your SHA-1 fingerprint |
| **iOS** | Must have bundle ID `com.seatingplanner.app` |

The **Web client ID** (the one ending in `.apps.googleusercontent.com` of type "Web application")
is what `@react-native-google-signin/google-signin` uses as `serverClientId` to get an `idToken`
that Firebase can verify. You do NOT need to hardcode it — the config plugin reads it from
`google-services.json` / `GoogleService-Info.plist` automatically.

If the Android or iOS client IDs don't exist yet, Firebase usually creates them when you add
the app (step 1/2 above). If not, create them manually under **Credentials → Create OAuth Client ID**.

---

## How to Build and Run

### Install Dependencies

```bash
cd ui
npm install
```

### Web (unchanged)

```bash
npx expo start --web
# or use start.sh / start.bat which runs everything in Docker
```

### Android (development build)

Expo Go does NOT support native modules like `@react-native-google-signin/google-signin`.
You need a **development build**:

```bash
# Option A: Local build (requires Android SDK)
npx expo prebuild --platform android
npx expo run:android

# Option B: Cloud build via EAS
npm install -g eas-cli
eas login
eas build --profile development --platform android
# Install the resulting APK/AAB on your device, then:
npx expo start --dev-client
```

### iOS (development build)

```bash
# Option A: Local build (requires Xcode + macOS)
npx expo prebuild --platform ios
npx expo run:ios

# Option B: Cloud build via EAS
eas build --profile development --platform ios
```

### EAS Build Configuration (if using cloud builds)

Create `ui/eas.json` if it doesn't exist:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

---

## Checklist

- [ ] `google-services.json` placed at `ui/google-services.json`
- [ ] `GoogleService-Info.plist` placed at `ui/GoogleService-Info.plist`
- [ ] Firebase Console: Android app added with package `com.seatingplanner.app`
- [ ] Firebase Console: iOS app added with bundle ID `com.seatingplanner.app`
- [ ] Firebase Console: SHA-1 fingerprint added for Android
- [ ] Google Cloud Console: Android + iOS OAuth client IDs exist
- [ ] `npm install` run after the package.json changes
- [ ] Using `npx expo run:android` or EAS dev build (NOT Expo Go)
