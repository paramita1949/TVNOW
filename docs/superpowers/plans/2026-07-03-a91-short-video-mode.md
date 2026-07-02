# A91 Short Video Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a true immersive short-video mode for the A91 source with vertical swiping, autoplay, next-item preload, and unchanged normal VOD behavior.

**Architecture:** Keep normal sources on `VideoActivity`; route only `a91`/`a91:` items into a new shared `ShortVideoActivity`. The activity owns one Media3 `PlayerView`, overlays a vertical `ViewPager2` for gestures and metadata, resolves CatVod detail/player URLs, caches preloaded next-player results, and advances on swipe or playback end.

**Tech Stack:** Android Java, Media3, ViewBinding, ViewPager2, CatVod `SiteApi`, existing `PlaybackActivity`/`PlaybackService`.

---

### Task 1: RED structural verifier

**Files:**
- Create: `scripts/verify_short_video_mode.py`

- [x] **Step 1: Write the failing verifier**
  - Check that the short-video activity, adapter, store, utility, layouts, manifest registration, A91-only routing, and normal `VideoActivity` fallback all exist.

- [x] **Step 2: Run it before implementation**
  - Run: `python scripts/verify_short_video_mode.py`
  - Expected: FAIL because short-video files are not implemented yet.

### Task 2: Shared short-video implementation

**Files:**
- Create: `app/src/main/java/com/fongmi/android/tv/feature/shortvideo/ShortVideo.java`
- Create: `app/src/main/java/com/fongmi/android/tv/feature/shortvideo/ShortVideoStore.java`
- Create: `app/src/main/java/com/fongmi/android/tv/ui/adapter/ShortVideoAdapter.java`
- Create: `app/src/main/java/com/fongmi/android/tv/ui/activity/ShortVideoActivity.java`
- Create: `app/src/main/res/layout/activity_short_video.xml`
- Create: `app/src/main/res/layout/adapter_short_video.xml`
- Modify: `app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Implement source guard and launch store**
  - `ShortVideo.isSupported(key, id)` returns true only for `a91` or ids starting with `a91:`.
  - `ShortVideoStore` stores the current in-memory list and selected index to avoid binder-size issues.

- [ ] **Step 2: Implement immersive activity**
  - Use `ViewPager2.ORIENTATION_VERTICAL`.
  - Resolve detail/player using `SiteApi`/`SiteViewModel`.
  - Start direct HLS playback via existing `PlaybackActivity.startPlayer`.
  - Preload next item with background `SiteApi.detailContent` + `SiteApi.playerContent`.
  - Auto-advance on `Player.STATE_ENDED`.

### Task 3: Route A91 clicks only

**Files:**
- Modify: `app/src/mobile/java/com/fongmi/android/tv/ui/fragment/TypeFragment.java`
- Modify: `app/src/mobile/java/com/fongmi/android/tv/ui/fragment/CollectFragment.java`
- Modify: `app/src/leanback/java/com/fongmi/android/tv/ui/activity/HomeActivity.java`
- Modify: `app/src/leanback/java/com/fongmi/android/tv/ui/fragment/TypeFragment.java`
- Modify: `app/src/leanback/java/com/fongmi/android/tv/ui/fragment/CollectFragment.java`

- [ ] **Step 1: Add A91 branch**
  - If `ShortVideo.isSupported(...)`, call `ShortVideoActivity.start(...)` with the current list and selected item.

- [ ] **Step 2: Keep fallback**
  - Non-A91 sources continue calling `VideoActivity.start(...)` or `VideoActivity.collect(...)`.

### Task 4: Verification

**Files:**
- Existing source-verification scripts and Gradle project.

- [ ] **Step 1: Run structural verifier**
  - `python scripts/verify_short_video_mode.py`

- [ ] **Step 2: Run source verifiers**
  - `node scripts/verify_a91_source.mjs`
  - `node scripts/verify_aida_source.mjs`
  - `python scripts/validate_adult_sources.py --keys a91`

- [ ] **Step 3: Compile**
  - `.\gradlew.bat assembleDebug`

- [ ] **Step 4: Final checks**
  - `git diff --check`
  - `codegraph status`
