---
name: cleanframe-android-tv
description: Make, debug, build, and deploy changes to the CleanFrame Android TV app.
---

# CleanFrame Android TV

Use this skill when changing the CleanFrame launcher in this repository or installing a new build on an Android TV / Google TV target.

## Project map

- The Android app is `app/`, with application ID `com.example.tv`.
- The WebView UI is in `app/src/main/assets/cleanframe/`: `index.html`, `main.js`, `style.css`, and supporting scripts/assets.
- The native Android host and JavaScript bridge are in `app/src/main/java/com/example/tv/MainActivity.java`.
- The launcher/Home and Leanback declarations are in `app/src/main/AndroidManifest.xml`.
- User-facing project documentation is in `README.md`.

Before editing, inspect `git status --short` and the relevant code and tests. Preserve unrelated worktree changes. Do not include local workspace files such as `workspace.code-workspace` in app commits.

## Make and validate a change

1. Trace the existing UI/state flow and native bridge before changing behavior. Keep Android-host changes, WebView changes, and documentation consistent.
2. Make the smallest change that satisfies the request. Do not remove or disable device packages as part of an app update. Any requested package removal needs separate confirmation for each package.
3. Run focused checks for the changed code:

   ```bash
   node --check app/src/main/assets/cleanframe/main.js
   git diff --check
   ```

   If other JavaScript files changed, run `node --check` on those too. For UI behavior, preview `app/src/main/assets/cleanframe/index.html` in a browser and exercise the real controls/state where possible.
4. Build and run Android unit tests:

   ```bash
   ANDROID_HOME="$HOME/Android/Sdk" ./gradlew -q testDebugUnitTest assembleDebug
   ```

   If the SDK is installed elsewhere, set `ANDROID_HOME` to its actual path. Do not add a machine-specific `local.properties` file to the repository.

## Commit cadence

- Commit each independently reviewable feature or fix after its focused checks pass; include directly related tests and documentation in that commit.
- For work spanning multiple features, commit at their natural boundaries instead of accumulating everything into one end-of-task commit or making commits for every small edit.
- Before each commit, review `git status --short` and `git diff`, then stage only the intended paths. Keep unrelated work, generated APKs, local settings, and `workspace.code-workspace` out.
- Use a concise commit message describing the behavior change. Keep commits local unless the user explicitly asks to push.

## Debug on a device

1. Find or connect the intended target; do not assume its address or debugging port is unchanged:

   ```bash
   adb devices -l
   adb connect <device-ip>:<port>
   ```

   Assign the selected endpoint to `TV`, then include `-s "$TV"` in every ADB command. Wireless-debugging ports can change; the QS01 may use port `5555`.
2. Restart CleanFrame and inspect Android/WebView logs:

   ```bash
   adb -s "$TV" logcat -c
   adb -s "$TV" shell am force-stop com.example.tv
   adb -s "$TV" shell am start -n com.example.tv/.MainActivity
   adb -s "$TV" logcat -d -v time | grep -E 'AndroidRuntime|chromium|CleanFrame'
   ```

   For live logs, use `adb -s "$TV" logcat -v time` and stop the command with Ctrl+C. Reproduce the issue and note whether it is in the Android host, WebView, device bridge, or network/content loading.
3. Verify the reported behavior on the target using the remote controls. Also confirm CleanFrame still launches and, when relevant, remains the configured Home app:

   ```bash
   adb -s "$TV" shell cmd package resolve-activity --brief \
     -a android.intent.action.MAIN -c android.intent.category.HOME
   ```

   Do not change the default Home app unless requested.

## Update the target

After checks pass, install the debug APK over the existing installation so app data and settings are preserved:

```bash
APK=app/build/outputs/apk/debug/app-debug.apk
adb -s "$TV" install -r "$APK"
adb -s "$TV" shell am start -n com.example.tv/.MainActivity
```

Confirm installation succeeds, the app opens, and the changed feature works on that specific target. Repeat for each target requested, selecting and verifying its ADB endpoint independently. Do not use `adb uninstall`, clear app data, or alter the target's package/launcher configuration as a shortcut for an update; explain the issue and ask before any action that could remove data or change system behavior.
