# XGS Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `xgs262.shop` video site as a built-in TVNOW VOD source.

**Architecture:** Implement the site as a `type: 3` QuickJS Spider asset and register it in the bundled VOD config. The Spider returns list/detail metadata via HTML parsing and returns the video page as a parse target, letting the existing WebView sniffer auto-click the gate and capture the final m3u8.

**Tech Stack:** TVNOW/FongMi Android, QuickJS Spider module, `libretv_config.json`, Node-based local verification script, Gradle Android build.

---

### Task 1: Add a source verification script

**Files:**
- Create: `D:\img\flutter\tvshow\scripts\verify_xgs_source.mjs`
- Reads: `D:\img\flutter\tvshow\app\src\main\assets\libretv_config.json`
- Reads: `D:\img\flutter\tvshow\app\src\main\assets\js\xgs.js`

- [ ] **Step 1: Write the failing verification**

Create a Node script that asserts:

```js
// scripts/verify_xgs_source.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'app/src/main/assets/libretv_config.json');
const spiderPath = path.join(root, 'app/src/main/assets/js/xgs.js');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const site = config.sites.find((item) => item.key === 'xgs');

if (!site) throw new Error('Missing xgs site in libretv_config.json');
if (site.type !== 3) throw new Error(`Expected xgs type 3, got ${site.type}`);
if (site.api !== 'assets://js/xgs.js') throw new Error(`Unexpected xgs api: ${site.api}`);
if (!fs.existsSync(spiderPath)) throw new Error('Missing app/src/main/assets/js/xgs.js');

const spider = await import(path.toNamespacedPath(spiderPath));
for (const name of ['home', 'category', 'detail', 'play', 'search']) {
  if (typeof spider.default?.[name] !== 'function') throw new Error(`Missing default.${name}`);
}
if (typeof spider.extractVideoItems !== 'function') throw new Error('Missing extractVideoItems export');
if (typeof spider.extractVideoDetail !== 'function') throw new Error('Missing extractVideoDetail export');
if (typeof spider.buildGateClick !== 'function') throw new Error('Missing buildGateClick export');
```

- [ ] **Step 2: Run it to verify RED**

Run:

```powershell
node scripts/verify_xgs_source.mjs
```

Expected: fails with `Missing xgs site in libretv_config.json` or missing `xgs.js`.

### Task 2: Create the XGS QuickJS Spider

**Files:**
- Create: `D:\img\flutter\tvshow\app\src\main\assets\js\xgs.js`
- Test: `D:\img\flutter\tvshow\scripts\verify_xgs_source.mjs`

- [ ] **Step 1: Implement the Spider module**

Create `xgs.js` with:

```js
export const BASE = 'https://xgs262.shop';
export const CATEGORIES = [
  ['国产视频', '国产视频'],
  ['中文字幕', '中文字幕'],
  ['有码视频', '有码视频'],
  ['有码破解', '有码破解'],
  ['动漫视频', '动漫视频'],
  ['欧美视频', '欧美视频'],
];

export function buildGateClick() {
  return "document.querySelector('#checkbox')?.click();document.querySelector('#Link')?.click();";
}

export function extractVideoItems(html) {
  // Parse links like /video/384764.html and nearby image/title/date text.
}

export function extractVideoDetail(html, id) {
  // Parse h1/category/iframe/thumb metadata and return one vod object.
}

export default {
  init() {},
  home(filter) {},
  homeVod() {},
  category(tid, pg, filter, extend) {},
  detail(id) {},
  play(flag, id) {},
  search(key, quick, pg) {},
  destroy() {},
};
```

The implementation must keep network access inside Spider methods, not module top-level, so Node can import it for verification.

- [ ] **Step 2: Run verification**

Run:

```powershell
node scripts/verify_xgs_source.mjs
```

Expected after Task 3: PASS.

### Task 3: Register the built-in source

**Files:**
- Modify: `D:\img\flutter\tvshow\app\src\main\assets\libretv_config.json`

- [ ] **Step 1: Add site entry near the top of `sites`**

Add:

```json
{
  "key": "xgs",
  "name": "西瓜色",
  "type": 3,
  "api": "assets://js/xgs.js",
  "searchable": 1,
  "quickSearch": 1,
  "changeable": 1,
  "timeout": 20,
  "click": "document.querySelector('#checkbox')?.click();document.querySelector('#Link')?.click();"
}
```

- [ ] **Step 2: Run verification**

Run:

```powershell
node scripts/verify_xgs_source.mjs
```

Expected: no thrown errors.

### Task 4: Validate app integration

**Files:**
- Verify: `D:\img\flutter\tvshow\app\src\main\assets\libretv_config.json`
- Verify: `D:\img\flutter\tvshow\app\src\main\assets\js\xgs.js`

- [ ] **Step 1: Validate JSON and JS syntax**

Run:

```powershell
node scripts/verify_xgs_source.mjs
node --check app/src/main/assets/js/xgs.js
python -m json.tool app/src/main/assets/libretv_config.json > $env:TEMP\libretv_config.check.json
```

Expected: all commands exit `0`.

- [ ] **Step 2: Run Android build smoke test**

Run:

```powershell
$env:ANDROID_HOME='D:\Program Files\Android\SDK'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:Path="$env:JAVA_HOME\bin;C:\Users\Administrator\AppData\Local\Programs\Python\Python310;C:\Users\Administrator\AppData\Local\Programs\Python\Python310\Scripts;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"
.\gradlew.bat :app:assembleMobileArm64_v8aRelease "-PciVersionCode=552998" "-PciVersionName=5.5.2.sources" --stacktrace
```

Expected: Gradle exits `0`.
