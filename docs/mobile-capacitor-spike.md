# Android/iOS Capacitor Shell Spike

> **Verdict:** PARTIAL — Capacitor Android/iOS native projects were generated and Android debug APK build passed in WSL. iOS project generation/sync works, but iOS native build is blocked by WSL lacking Xcode/CocoaPods/macOS.

## Question

Given the current Web/PWA Hermes Work and the Tauri desktop shell, can we add a Capacitor shell that reuses the same `dist` output for Android and iOS without changing the core session/task implementation?

## Approach

- Keep the web source and build pipeline unchanged.
- Add `capacitor.config.json` pointing to the existing `dist` directory.
- Add optional mobile scripts:
  - `npm run mobile` → `npx cap sync`
  - `npm run mobile:android` → `npx cap open android`
  - `npm run mobile:ios` → `npx cap open ios`
  - `npm run mobile:doctor` → `npx cap doctor`
- Add Capacitor 7.6.5 packages because the current local Node is v20.20.2. Capacitor 8.3.4 is latest, but its CLI requires Node >=22.
- Generate native `android/` and `ios/` projects via Capacitor.

## What worked

- `npm test` passes: 21/21 tests.
- `npm run build` produces `dist`.
- `npx cap add android` generated the Android project and copied the current web assets.
- `npx cap add ios` generated the iOS project and copied the current web assets.
- `npm run mobile` syncs both Android and iOS projects.
- Android SDK command-line tools, platform 35, platform-tools, and build-tools were installed under `/home/ml/Android/Sdk`.
- Android debug APK build passed:

```bash
export ANDROID_HOME=/home/ml/Android/Sdk
export ANDROID_SDK_ROOT=/home/ml/Android/Sdk
export GRADLE_OPTS='-Djavax.net.ssl.trustStore=/tmp/awc-java-cacerts -Djavax.net.ssl.trustStorePassword=changeit'
cd android
./gradlew assembleDebug
```

Result:

```text
BUILD SUCCESSFUL
android/app/build/outputs/apk/debug/app-debug.apk  # 3.9M
```

## What did not work / blockers

- `npm run mobile:doctor` returns non-zero because Xcode is not installed in WSL:

```text
[error] Xcode is not installed
[success] Android looking great! 👌
```

- iOS native build and simulator smoke require macOS + Xcode + CocoaPods.
- Android build in the Stradvision network needed a Java truststore containing the Stradvision CA. Without it, Gradle wrapper and SDK downloads failed with PKIX/certificate errors.
- Capacitor Android compilation required Java 21. Java 17 failed with `invalid source release: 21`.

## Environment notes

The working WSL setup used:

```bash
sudo apt-get install -y openjdk-21-jdk
# Android SDK installed manually with commandlinetools-linux-14742923_latest.zip
# sdkmanager packages: platform-tools, platforms;android-35, build-tools;35.0.0
```

For corporate TLS interception, create a temporary Java truststore from `/home/ml/.hermes/certs/ca-bundle-with-stradvision.pem` and run Gradle/sdkmanager with:

```bash
-Djavax.net.ssl.trustStore=/tmp/awc-java-cacerts
-Djavax.net.ssl.trustStorePassword=changeit
```

## Recommendation for the real build

Use Capacitor for Android/iOS shell work. The current proof point is strong enough to move to a mobile UX pass next:

1. Compact phone layout for session list + chat.
2. Mobile-safe input behavior and safe-area handling.
3. Remote gateway configuration/storage strategy.
4. Android install/smoke on a real device or emulator.
5. iOS build/smoke on a macOS runner or developer Mac.
