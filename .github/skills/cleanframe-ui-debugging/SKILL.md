---
name: cleanframe-ui-debugging
description: Reproduce and regression-test CleanFrame's Android TV WebView UI in a browser and on a device.
---

# CleanFrame UI debugging

Use this skill for layout, remote-navigation, settings/state, wallpaper, and WebView UI issues in CleanFrame. The browser test surface is the real app UI, not a mock.

## Reproduce in a browser

1. Open `app/src/main/assets/cleanframe/index.html` in the integrated browser. The stage is designed around a 1920 × 1080 TV viewport; use that viewport when checking layout and clipping.
2. Use Playwright controls for reproducible UI interactions: set the viewport, query elements with accessible roles or stable selectors, send remote-style key presses, and capture screenshots. For example:

   ```js
   await page.setViewportSize({ width: 1920, height: 1080 });
   await page.getByRole('button', { name: 'Settings' }).click();
   await page.keyboard.press('ArrowDown');
   ```

   Check for browser console errors and uncaught page errors when reproducing a failure. Prefer visible behavior and accessible locators; inspect computed styles or stage classes when diagnosing contrast, layout, or asynchronous appearance updates.
3. Read the current UI and committed settings before interacting. The app exposes a `window.QA` bridge for browser checks:

   ```js
   window.QA.state()
   window.QA.where()
   window.QA.actions()
   ```

4. Use the bridge when deterministic state inspection or navigation is more useful than pointer interaction:

   ```js
   window.QA.nav('down', 'enter')
   window.QA.look({ bg: 'bing', layout: 'list' })
   window.QA.scene('home')
   ```

   Supported scenes are `home`, `apps`, `settings`, `appearance`, and `editor`. Navigation accepts `up`, `down`, `left`, `right`, `enter`/`ok`, and `back`/`escape`. Check the live implementation in `main.js` if an action or choice is unclear.
5. `QA.look()` writes normal app preferences. Prefer a disposable browser profile; if using a shared preview, record the starting settings and restore them after the test. Do not use the QA bridge to change a physical TV's configuration.
6. For wallpaper or other network-backed features, distinguish a rendering/state bug from a failed request or unavailable CORS access. Check the browser console and rendered stage classes/computed styles; verify that the intended fallback remains usable when remote content cannot load.

The repository has no Playwright package or test configuration. Use the integrated browser's Playwright capability for interactive debugging; do not add a package, config, or persistent browser test harness unless the task calls for it.

## Verify Android-specific behavior

Browser tests do not replace a device check. Android WebView, display geometry, system settings intents, hardware keys, native bridge calls, and TV focus behavior can differ from desktop Chromium.

After building and installing with the workflow in `cleanframe-android-tv`:

- Reproduce with the TV remote and confirm focus, clipping, and transitions at the target's actual resolution.
- For native crashes, inspect `AndroidRuntime` in ADB logcat. For WebView failures, inspect `chromium` and app logs.
- Check the native/WebView boundary when a browser-only test passes but the TV fails: remote key forwarding, `MainActivity` bridge methods, and `device.js`.
- Preserve the target's app data and Home configuration while debugging. Ask before clearing data, changing the default launcher, or changing any device package.

## Focused checks

Run the app's normal validations for the affected layer:

```bash
node --check app/src/main/assets/cleanframe/main.js
git diff --check
ANDROID_HOME="$HOME/Android/Sdk" ./gradlew -q testDebugUnitTest assembleDebug
```

Add or update tests only for behavior that can be isolated reliably. For focus, geometry, wallpaper contrast, and external image loading, combine a reproducible browser check with the required on-device verification.
