# XFCA Source Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `bbs.xfca2022.com/kb` aggregation source as `2048快播` by calling its underlying `/forav/*` aggregation APIs directly.

**Architecture:** Implement a type-3 JavaScript spider at `app/src/main/assets/js/xfca.js`. The spider maps stable HLS categories to their list/detail endpoints, parses JSON list rows, fetches details on demand, extracts DPlayer `data-config` or direct `.m3u8/.mp4` URLs, and returns direct `parse: 0` playback.

**Tech Stack:** TVBox JavaScript spider API, Node.js ESM verifier, Android/Gradle project.

---

### Task 1: Verification first

**Files:**
- Create: `scripts/verify_xfca_source.mjs`

- [x] **Step 1: Write failing verifier**

Verifier checks config registration, helper exports, stable categories, list/detail parsing, and HLS playback from the `list75/info75` route.

- [x] **Step 2: Run RED**

Run: `node scripts/verify_xfca_source.mjs`
Expected: fails with `Missing xfca site in libretv_config.json`.

### Task 2: Implement source

**Files:**
- Create: `app/src/main/assets/js/xfca.js`
- Modify: `app/src/main/assets/libretv_config.json`

- [x] **Step 1: Create spider**

Expose `API_BASES`, `SOURCE`, `CATEGORIES`, `buildListUrl`, `buildInfoUrl`, `parseListResponse`, `parseDetailResponse`, `formatVodItem`, `formatVodDetail`, `encodeVodId`, `decodeVodId`, and `normalizeUrl`.

- [x] **Step 2: Register config**

Add `{ key: "xfca", name: "2048快播", type: 3, api: "assets://js/xfca.js", searchable: 0, quickSearch: 0, changeable: 1, timeout: 20 }`.

### Task 3: Verify

**Files:**
- Test: `scripts/verify_xfca_source.mjs`

- [x] **Step 1: Run source verifier**

Run: `node scripts/verify_xfca_source.mjs`
Expected: `XFCA source verification passed`.

- [x] **Step 2: Run build checks**

Run:
```powershell
git diff --check
.\gradlew.bat assembleDebug
```
Expected: both exit 0.
