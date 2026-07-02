import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    target = ROOT / path
    assert target.exists(), f"Missing {path}"
    return target.read_text(encoding="utf-8")


def assert_contains(path: str, *needles: str) -> str:
    text = read(path)
    for needle in needles:
        assert needle in text, f"{path} should contain {needle!r}"
    return text


def assert_regex(path: str, pattern: str) -> str:
    text = read(path)
    assert re.search(pattern, text, re.S), f"{path} should match /{pattern}/"
    return text


def main() -> None:
    assert_contains(
        "app/src/main/java/com/fongmi/android/tv/feature/shortvideo/ShortVideo.java",
        "KEY_A91",
        "PREFIX_A91",
        "isSupported",
    )
    assert_regex(
        "app/src/main/java/com/fongmi/android/tv/feature/shortvideo/ShortVideo.java",
        r'KEY_A91\s*=\s*"a91"',
    )
    assert_regex(
        "app/src/main/java/com/fongmi/android/tv/feature/shortvideo/ShortVideo.java",
        r'PREFIX_A91\s*=\s*"a91:"',
    )

    assert_contains(
        "app/src/main/java/com/fongmi/android/tv/feature/shortvideo/ShortVideoStore.java",
        "put(",
        "getItems",
        "getIndex",
    )

    assert_contains(
        "app/src/main/java/com/fongmi/android/tv/ui/activity/ShortVideoActivity.java",
        "extends PlaybackActivity",
        "ViewPager2.ORIENTATION_VERTICAL",
        "startPlayer(",
        "preloadNext",
        "Player.STATE_ENDED",
        "SCREEN_ORIENTATION_SENSOR_PORTRAIT",
        "getNavigationCallback",
        "loadSeq",
        "playerSeq",
    )
    assert_regex(
        "app/src/main/java/com/fongmi/android/tv/ui/activity/ShortVideoActivity.java",
        r"if\s*\(\s*playerSeq\s*!=\s*loadSeq\s*\)\s*return;",
    )

    assert_contains(
        "app/src/main/java/com/fongmi/android/tv/ui/adapter/ShortVideoAdapter.java",
        "class ShortVideoAdapter",
        "ImgUtil.load",
        "setPlaying",
    )

    assert_contains(
        "app/src/main/res/layout/activity_short_video.xml",
        "androidx.media3.ui.PlayerView",
        "androidx.viewpager2.widget.ViewPager2",
        "com.fongmi.android.tv.ui.custom.CustomSeekView",
    )
    assert_contains(
        "app/src/main/res/layout/adapter_short_video.xml",
        "@+id/cover",
        "@+id/name",
        "@+id/remark",
    )

    assert_regex(
        "app/src/main/AndroidManifest.xml",
        r'<activity[^>]+android:name="\.ui\.activity\.ShortVideoActivity"[^>]+android:screenOrientation="sensorPortrait"',
    )

    entry_files = [
        "app/src/mobile/java/com/fongmi/android/tv/ui/fragment/TypeFragment.java",
        "app/src/mobile/java/com/fongmi/android/tv/ui/fragment/CollectFragment.java",
        "app/src/leanback/java/com/fongmi/android/tv/ui/activity/HomeActivity.java",
        "app/src/leanback/java/com/fongmi/android/tv/ui/fragment/TypeFragment.java",
        "app/src/leanback/java/com/fongmi/android/tv/ui/fragment/CollectFragment.java",
    ]
    for path in entry_files:
        assert_contains(path, "ShortVideo.isSupported", "ShortVideoActivity.start", "VideoActivity")

    # Normal non-A91 VOD flow must remain available as the fallback branch.
    assert_regex(
        "app/src/mobile/java/com/fongmi/android/tv/ui/fragment/TypeFragment.java",
        r"if\s*\(\s*ShortVideo\.isSupported\(.+?\)\s*\).*?ShortVideoActivity\.start.+?else\s+VideoActivity\.start",
    )
    assert_regex(
        "app/src/leanback/java/com/fongmi/android/tv/ui/fragment/TypeFragment.java",
        r"if\s*\(\s*ShortVideo\.isSupported\(.+?\)\s*\).*?ShortVideoActivity\.start.+?else\s+VideoActivity\.start",
    )

    print("Short video mode structural verification passed")


if __name__ == "__main__":
    main()
