# Adult Sources Speed Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add only adult video sources that pass config parsing, content discovery, playable URL extraction, and network speed checks.

**Architecture:** Keep source definitions in the existing bundled config `app/src/main/assets/libretv_config.json`. Add a focused Python verification script under `scripts/` that reads the bundled config, validates selected new source keys, queries CMS endpoints, extracts detail/play URLs, and measures reachable media throughput. Treat JS/CSP candidates as dependency-reachable only unless their Spider can be executed; do not report them as playback-proven without a media URL test.

**Tech Stack:** Python 3 standard library for JSON/XML/HTTP validation; Android TVNOW/FongMi source config format; Gradle for final app build verification.

---

### Task 1: Add source validation script

**Files:**
- Create: `D:/img/flutter/tvshow/scripts/validate_adult_sources.py`
- Read: `D:/img/flutter/tvshow/app/src/main/assets/libretv_config.json`

- [ ] **Step 1: Create a verification script that fails when expected source keys are absent**

Create a Python script with these behaviors:

```python
# scripts/validate_adult_sources.py
# Usage: python scripts/validate_adult_sources.py --keys shayu
# It exits non-zero when any requested key is absent, endpoint parsing fails, no play URL is discovered, or media speed is below the default threshold.
```

- [ ] **Step 2: Run the script before editing config**

Run:

```powershell
python scripts/validate_adult_sources.py --keys shayu
```

Expected: FAIL because `shayu` is not yet in `libretv_config.json`.

### Task 2: Insert playback-proven adult CMS source

**Files:**
- Modify: `D:/img/flutter/tvshow/app/src/main/assets/libretv_config.json`

- [ ] **Step 1: Add `shayu` source**

Append this site object to `sites`:

```json
{
  "key": "shayu",
  "name": "鲨鱼A",
  "type": 1,
  "api": "https://shayuapi.com/api.php/provide/vod/",
  "searchable": 1,
  "quickSearch": 1,
  "filter": 1
}
```

- [ ] **Step 2: Run source validation**

Run:

```powershell
python scripts/validate_adult_sources.py --keys shayu --min-kbps 300
```

Expected: PASS only if category/list/detail extraction works and at least one direct play URL responds with acceptable throughput.

### Task 3: Probe non-CMS adult candidates without claiming playback unless media is proven

**Files:**
- No config edit unless a candidate yields a playable media URL through a testable path.
- Optional report output from `scripts/validate_adult_sources.py --probe-candidates`.

- [ ] **Step 1: Test remote dependencies for top JS/CSP candidates**

Probe these candidates for script/JAR/ext reachability: `Supjav`, `18AV`, `MissAV`, `Hanime`, `Jable`, `JavDb`, `黄仓库`, `xBPQ_麻豆映画`, `xBPQ_色花堂`.

- [ ] **Step 2: Only add candidates with executable playback proof**

If a JS/CSP source cannot be executed in this local verification environment and no media URL is extracted, do not write it as playback-proven. Keep it out of the default bundled config or report it as dependency-only.

### Task 4: Final verification

**Files:**
- Verify: `D:/img/flutter/tvshow/app/src/main/assets/libretv_config.json`
- Verify: `D:/img/flutter/tvshow/scripts/validate_adult_sources.py`

- [ ] **Step 1: Run JSON/config validation**

Run:

```powershell
python scripts/validate_adult_sources.py --keys shayu --min-kbps 300
```

Expected: PASS with class count, vod count, detail count, tested play URL, and measured speed.

- [ ] **Step 2: Run repository verification**

Run:

```powershell
codegraph status
git status --short --branch
git diff --check
```

Expected: CodeGraph up to date, intentional file changes only, no whitespace errors.

- [ ] **Step 3: Run Android build validation when config/script checks pass**

Run:

```powershell
$env:ANDROID_HOME='D:\Program Files\Android\SDK'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:Path="$env:JAVA_HOME\bin;C:\Users\Administrator\AppData\Local\Programs\Python\Python310;C:\Users\Administrator\AppData\Local\Programs\Python\Python310\Scripts;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
.\gradlew.bat :app:assembleMobileArm64_v8aRelease "-PciVersionCode=552998" "-PciVersionName=5.5.2.sources" --stacktrace
```

Expected: Gradle exits 0.

### Self-review

- Spec coverage: The plan covers adult-only source insertion, CMS playback/speed validation, non-CMS dependency probing, JSON validation, and Android build verification.
- Placeholder scan: No TBD/TODO/later placeholders remain.
- Type consistency: Source keys and file paths match the repository conventions; `shayu` matches the API key to be inserted and validated.
