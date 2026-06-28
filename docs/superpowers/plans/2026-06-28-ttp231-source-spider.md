# TTP231 Source Spider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local TVNOW VOD source for `ttp231.shop` and verify how many resources can be crawled before relying on it in the app.

**Architecture:** Keep the site-specific reverse parsing in focused JavaScript files. Use a Node-compatible crawler test harness to verify categories, lists, search, details, and m3u8 extraction. Add an app QuickJS Spider that reuses the same parsing strategy through the existing `type: 3` site loader.

**Tech Stack:** Node.js test harness, Android assets JSON config, FongMi/TV QuickJS Spider API, Gradle Android build.

---

### Task 1: Resource Crawl Verification Harness

**Files:**
- Create: `scripts/ttp231_probe.js`

- [x] **Step 1: Write the failing crawler harness**

Create `scripts/ttp231_probe.js` with CLI expectations for `--max-pages` and output counters. Initially it should exit non-zero until the fetch/decrypt implementation is filled in.

- [x] **Step 2: Run the harness to verify it fails**

Run: `node scripts/ttp231_probe.js --max-pages 1`
Expected: non-zero exit before implementation.

- [x] **Step 3: Implement fetch, Challenge cookie handling, AES-CTR HTML decrypt, list/search/detail parsing, and m3u8 verification**

The harness should print JSON with category count, list item count, detail success count, playable m3u8 count, and sample resources.

- [x] **Step 4: Run the harness to verify resource crawl results**

Run: `node scripts/ttp231_probe.js --max-pages 2 --details 8 --search MISSCAT`
Expected: exit 0, categories > 0, videos > 0, detail successes > 0, playable m3u8 > 0.

### Task 2: App Asset Spider

**Files:**
- Create: `app/src/main/assets/js/ttp231.js`
- Modify: `app/src/main/assets/libretv_config.json`

- [x] **Step 1: Create a JS Spider matching FongMi QuickJS method names**

Implement `init`, `home`, `homeVod`, `category`, `detail`, `play`, and `search` exports using the same selectors and extraction rules validated by `scripts/ttp231_probe.js`.

- [x] **Step 2: Add the site entry to `libretv_config.json`**

Add a `type: 3` site with `api: assets://js/ttp231.js`, key `ttp231`, name `偷偷啪A`, and enabled search flags.

### Task 3: Verification

**Files:**
- Verify: `scripts/ttp231_probe.js`
- Verify: `app/src/main/assets/libretv_config.json`
- Verify: Android Gradle project

- [x] **Step 1: Run resource crawl statistics**

Run: `node scripts/ttp231_probe.js --max-pages 2 --details 8 --search MISSCAT`
Expected: JSON shows resource and playback counts.

- [x] **Step 2: Validate JSON config**

Run: `python -m json.tool app/src/main/assets/libretv_config.json > $null`
Expected: exit 0.

- [x] **Step 3: Run project checks**

Run: `git diff --check`, `codegraph status`, and the smallest relevant Gradle assemble command.
Expected: no whitespace errors, CodeGraph OK, build success or a clearly reported external/environmental failure.

### Verification Notes

- `node scripts/ttp231_probe.js --max-pages 2 --details 20 --search MISSCAT`: exit 0, 352 unique videos, 20/20 playable, search count 22.
- `node scripts/ttp231_probe.js --max-pages all --details 20 --search MISSCAT`: exit 0, 8 categories, 6 pages/category, 22 items/page, 1056 unique videos, 20/20 playable, search count 22.
- `node --check app/src/main/assets/js/ttp231.js`: exit 0.
- `node --check scripts/ttp231_probe.js`: exit 0.
- `python -m json.tool app/src/main/assets/libretv_config.json > $null`: exit 0.
- `git diff --check`: exit 0.
- `codegraph sync` then `codegraph status`: index up to date.
- `.\gradlew.bat :app:mergeMobileArm64_v8aDebugAssets --stacktrace`: BUILD SUCCESSFUL.
