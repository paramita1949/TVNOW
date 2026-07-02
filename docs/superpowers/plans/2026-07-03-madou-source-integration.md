# Madou Source Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `madou.club` WordPress/DPlayer HLS source to TVNOW, rename the A91 source to `抖阴`, bump the app version, verify playback extraction, and push to GitHub.

**Architecture:** Implement a type-3 JavaScript spider at `app/src/main/assets/js/madou.js`. It parses WordPress list/search/category HTML into TVBox VOD rows, fetches each detail page, extracts the `dash.madou.club/share/...` iframe, fetches that iframe, extracts the tokenized HLS URL, and returns `parse: 0` playback with proper headers. Existing A91 short-video code remains unchanged except display-name alignment.

**Tech Stack:** Android/Gradle project, TVBox JavaScript spider API, Node.js ESM verification scripts, PowerShell, CodeGraph.

---

### Task 1: RED verification for madou source and A91 rename

**Files:**
- Create: `scripts/verify_madou_source.mjs`
- Modify: `scripts/verify_a91_source.mjs`

- [ ] **Step 1: Write failing madou verification**

Create `scripts/verify_madou_source.mjs` with assertions for:
- config site `{ key: "madou", name: "麻豆社", type: 3, api: "assets://js/madou.js" }`
- exported helpers `BASE`, `DASH_BASE`, `SOURCE`, `CATEGORIES`, `buildCategoryUrl`, `buildSearchUrl`, `parseListFromHtml`, `parseDetailFromHtml`, `parseShareFromHtml`, `formatVodItem`, `formatVodDetail`, `normalizeUrl`
- live homepage/category/search/detail/share parsing and direct HLS fetch returning `#EXTM3U`.

- [ ] **Step 2: Run RED**

Run: `node scripts/verify_madou_source.mjs`
Expected: FAIL because `app/src/main/assets/js/madou.js` and config entry do not exist.

- [ ] **Step 3: Update A91 expected name**

Change `assert.equal(site.name, '抖阴A');` to `assert.equal(site.name, '抖阴');` in `scripts/verify_a91_source.mjs`.

### Task 2: Implement madou source and config/version updates

**Files:**
- Create: `app/src/main/assets/js/madou.js`
- Modify: `app/src/main/assets/libretv_config.json`
- Modify: `app/build.gradle`

- [ ] **Step 1: Add `madou.js` minimal spider**

Implement:
- fixed categories from website navigation plus `最新更新` root
- `buildCategoryUrl(tid, pg)` using `/page/N/`
- `buildSearchUrl(key, pg)` using `/?s=` and `/page/N/?s=`
- `parseListFromHtml(html)` matching `<article class="excerpt...">` cards and data-src images
- `parseDetailFromHtml(html, fallback)` extracting title, tags, view count, image, and iframe share URL
- `parseShareFromHtml(html, shareUrl)` extracting `var token` and `var m3u8`, returning absolute tokenized HLS URL plus poster
- spider `home`, `homeVod`, `category`, `detail`, `play`, `search`, `destroy`.

- [ ] **Step 2: Register source and rename A91**

In `app/src/main/assets/libretv_config.json`:
- change A91 `name` from `抖阴A` to `抖阴`
- add madou after A91 with `key: "madou"`, `name: "麻豆社"`, `type: 3`, `api: "assets://js/madou.js"`, `searchable: 1`, `quickSearch: 1`, `changeable: 1`, `timeout: 20`.

- [ ] **Step 3: Bump version**

In `app/build.gradle`, bump `baseVersionCode` from `558` to `559` and `baseVersionName` from `"5.5.8"` to `"5.5.9"`.

### Task 3: GREEN verification and build

**Files:**
- Test: `scripts/verify_madou_source.mjs`
- Test: `scripts/verify_a91_source.mjs`
- Test: `scripts/verify_aida_source.mjs`
- Test: `scripts/verify_short_video_mode.py`

- [ ] **Step 1: Run targeted source checks**

Run:
```powershell
node scripts/verify_madou_source.mjs
node scripts/verify_a91_source.mjs
node scripts/verify_aida_source.mjs
python scripts/verify_short_video_mode.py
```
Expected: each exits 0.

- [ ] **Step 2: Run broader validation and compile**

Run:
```powershell
python scripts/validate_adult_sources.py --keys a91
.\gradlew.bat assembleDebug
git diff --check
codegraph sync
codegraph status
```
Expected: each exits 0; CodeGraph reports up to date.

### Task 4: Commit and push

**Files:** all changed files in working tree.

- [ ] **Step 1: Review diff**

Run: `git status --short` and `git diff --stat`.

- [ ] **Step 2: Commit**

Run:
```powershell
git add .
git commit -m "feat: add madou source and short video mode"
```

- [ ] **Step 3: Push**

Run:
```powershell
git push origin main
git status --short
git log -1 --oneline
```
