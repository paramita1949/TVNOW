# TVNOW Agent Notes

This repository is the active Android app project. Work in this folder only:

- Project path: `D:\img\flutter\tvshow\TVNOW`
- GitHub repo: `https://github.com/paramita1949/TVNOW.git`
- Main branch: `main`
- Base app: FongMi/TV Android app, adjusted for mobile use

Do not use or recreate the old `FongMi-TV-src` folder. It was a temporary source folder and has been removed.

## Required Skills and Preflight

For every development turn, load and follow these skills before code exploration or edits:

- `C:\Users\Administrator\.codex\superpowers\skills\using-superpowers\SKILL.md`
- `C:\Users\Administrator\.codex\superpowers\skills\systematic-debugging\SKILL.md`
- `C:\Users\Administrator\.codex\superpowers\skills\verification-before-completion\SKILL.md`

Before relying on code context, refresh CodeGraph:

```powershell
codegraph status
```

If the index is not ready or reports pending/stale files:

```powershell
codegraph init -i
# or, when already initialized:
codegraph sync
```

Prefer CodeGraph for architecture/symbol/call-flow questions when available. Use `rg` / `rg --files` for fast text and file search.

## Key Files

- Bundled VOD source config: `app/src/main/assets/libretv_config.json`
- Default built-in config registration: `app/src/main/java/com/fongmi/android/tv/App.java`
- Default config value: `assets://libretv_config.json`
- App Gradle config and release signing defaults: `app/build.gradle`
- Release keystore: `keystore/tvnow-release.jks`
- GitHub Actions release build: `.github/workflows/build-mobile-release.yml`

When adding or changing sources, start with `app/src/main/assets/libretv_config.json`, then verify the app still points to that asset in `App.java`.

## Local Android Build

The machine may not have Java on PATH by default. Use these environment variables before running Gradle:

```powershell
$env:ANDROID_HOME='D:\Program Files\Android\SDK'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:Path="$env:JAVA_HOME\bin;C:\Users\Administrator\AppData\Local\Programs\Python\Python310;C:\Users\Administrator\AppData\Local\Programs\Python\Python310\Scripts;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
```

Release build command used for local verification:

```powershell
.\gradlew.bat :app:assembleMobileArm64_v8aRelease "-PciVersionCode=552998" "-PciVersionName=5.5.2.sources" --stacktrace
```

The GitHub workflow currently builds the mobile ARM64 release variant and publishes it to GitHub Releases.

## Release and Update Notes

- Releases are published under `https://github.com/paramita1949/TVNOW/releases`.
- The app update flow should check GitHub Releases for `paramita1949/TVNOW`.
- Release signing defaults are in `app/build.gradle`; the committed keystore defaults are intended for this project.
- A normal Android app cannot silently uninstall and reinstall itself. Debug-to-release migration may require manually uninstalling the debug build once, unless both APKs use the same package name and compatible signing.

## Working Rules

- Keep edits scoped to `TVNOW`; do not push to FongMi upstream.
- Do not revert user changes unless explicitly requested.
- Prefer small commits with clear messages.
- Before saying work is complete, run fresh verification such as:

```powershell
codegraph status
git status --short --branch
git diff --check
```

For code or build changes, also run the smallest relevant Gradle build/test command that proves the change.

