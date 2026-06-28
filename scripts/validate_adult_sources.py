#!/usr/bin/env python3
"""Validate bundled adult sources for discoverability and playable media speed.

This script is intentionally dependency-free so it can run on the Windows build
host before Android packaging.
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any, Iterable

DEFAULT_CONFIG = Path("app/src/main/assets/libretv_config.json")
DEFAULT_UA = "Mozilla/5.0 (Linux; Android 13; TVNOW) AppleWebKit/537.36 Chrome/126 Safari/537.36"
MEDIA_EXT_RE = re.compile(r"\.(m3u8|mp4|m4v|ts)(?:[?#]|$)", re.I)
JAR_MAGIC = (b"PK\x03\x04", b"dex\n")

# Dependency-only non-CMS candidates discovered from public TVBox R18 configs.
# These are probed for reachability but are not treated as playback-proven unless
# a runnable Spider path yields a media URL in a future verifier.
NON_CMS_CANDIDATES: list[dict[str, str]] = [
    {"key": "supjav_sp", "name": "SupjavA", "type": 3, "api": "csp_Supjav", "jar": "assets://jar/adult_r18_javdb.jar"},
    {"key": "eighteen_sp", "name": "18AVA", "type": 3, "api": "csp_Eighteen", "jar": "assets://jar/adult_r18_javdb.jar"},
    {"key": "missav_sp", "name": "MissAVA", "type": 3, "api": "csp_Miss", "jar": "assets://jar/adult_r18_javdb.jar"},
    {"key": "hanime_sp", "name": "HanimeA", "type": 3, "api": "csp_Hanime", "jar": "assets://jar/adult_r18_javdb.jar"},
    {"key": "jable_sp", "name": "JableA", "type": 3, "api": "csp_Jable", "jar": "assets://jar/adult_r18_javdb.jar"},
    {"key": "javdb_sp", "name": "JavDbA", "type": 3, "api": "csp_JavDb", "jar": "assets://jar/adult_r18_javdb.jar"},
    {"key": "huangcangku_xbpq", "name": "黄仓库A", "type": 3, "api": "csp_XBPQ", "jar": "assets://jar/adult_xbpq.jar", "ext": "assets://xbpq/huangcangku.json"},
    {"key": "madou_yinghua_xbpq", "name": "麻豆映画A", "type": 3, "api": "csp_XBPQ", "jar": "assets://jar/adult_xbpq.jar", "ext": "assets://xbpq/madou_yinghua.json"},
    {"key": "sehuatang_xbpq", "name": "色花堂A", "type": 3, "api": "csp_XBPQ", "jar": "assets://jar/adult_xbpq.jar", "ext": "assets://xbpq/sehuatang.json"},
]


@dataclass
class FetchResult:
    url: str
    code: int
    content_type: str
    body: bytes
    elapsed: float


class ValidationError(Exception):
    pass


def eprint(*args: object) -> None:
    print(*args, file=sys.stderr)


def ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def split_semicolon_url(url: str) -> str:
    # TVBox configs often append ;md5;<hash> to jar URLs.
    return url.split(";md5;", 1)[0]


def looks_like_jar(data: bytes) -> bool:
    return any(data.startswith(magic) for magic in JAR_MAGIC)


def jar_has_spider_class(data: bytes, class_name: str) -> bool:
    descriptor = f"Lcom/github/catvod/spider/{class_name};".encode()
    if data.startswith(b"dex\n"):
        return descriptor in data
    try:
        with zipfile.ZipFile(BytesIO(data)) as jar:
            for name in jar.namelist():
                if name.endswith(".dex") and descriptor in jar.read(name):
                    return True
    except zipfile.BadZipFile:
        return False
    return False


def dependency_url(value: str) -> str:
    return split_semicolon_url(value.strip())


def asset_path(value: str, config_path: Path) -> Path | None:
    prefix = "assets://"
    if not value.startswith(prefix):
        return None
    rel = value[len(prefix) :].lstrip("/\\")
    path = (config_path.parent / rel).resolve()
    assets_root = config_path.parent.resolve()
    if assets_root != path and assets_root not in path.parents:
        raise ValidationError(f"asset path escapes assets directory: {value}")
    return path


def add_query(url: str, params: dict[str, str]) -> str:
    parsed = urllib.parse.urlsplit(url.strip())
    query = dict(urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))
    query.update(params)
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(query), parsed.fragment))


def fetch(
    url: str,
    timeout: float,
    *,
    max_bytes: int | None = None,
    headers: dict[str, str] | None = None,
    retries: int = 2,
) -> FetchResult:
    req_headers = {"User-Agent": DEFAULT_UA, "Accept": "*/*"}
    if headers:
        req_headers.update(headers)
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, headers=req_headers)
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
                body = response.read(max_bytes) if max_bytes else response.read()
                elapsed = time.perf_counter() - started
                return FetchResult(
                    url=response.geturl(),
                    code=getattr(response, "status", 200),
                    content_type=response.headers.get("content-type", ""),
                    body=body,
                    elapsed=elapsed,
                )
        except urllib.error.HTTPError as exc:
            body = exc.read(max_bytes or 4096)
            elapsed = time.perf_counter() - started
            return FetchResult(url=url, code=exc.code, content_type=exc.headers.get("content-type", ""), body=body, elapsed=elapsed)
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(0.4 * (attempt + 1))
                continue
            raise
    raise last_error if last_error else ValidationError(f"fetch failed: {url}")


def fetch_text(url: str, timeout: float, max_bytes: int | None = None) -> tuple[str, FetchResult]:
    result = fetch(url, timeout, max_bytes=max_bytes)
    encoding = "utf-8-sig"
    match = re.search(r"charset=([^;]+)", result.content_type, re.I)
    if match:
        encoding = match.group(1).strip()
    return result.body.decode(encoding, errors="replace"), result


def load_config(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        raise ValidationError(f"config JSON parse failed: {exc}") from exc


def site_map(config: dict[str, Any]) -> dict[str, dict[str, Any]]:
    sites = config.get("sites")
    if not isinstance(sites, list):
        raise ValidationError("config.sites is not a list")
    output: dict[str, dict[str, Any]] = {}
    for site in sites:
        if isinstance(site, dict) and site.get("key"):
            output[str(site["key"])] = site
    return output


def parse_json_response(text: str, label: str) -> dict[str, Any]:
    stripped = text.strip("\ufeff \r\n\t")
    if not stripped.startswith("{"):
        raise ValidationError(f"{label} did not return JSON object; sample={stripped[:120]!r}")
    try:
        data = json.loads(stripped)
    except Exception as exc:
        raise ValidationError(f"{label} JSON parse failed: {exc}; sample={stripped[:120]!r}") from exc
    if not isinstance(data, dict):
        raise ValidationError(f"{label} JSON root is not object")
    return data


def extract_classes(data: dict[str, Any]) -> list[dict[str, Any]]:
    classes = data.get("class") or data.get("classes") or []
    if not isinstance(classes, list):
        return []
    return [item for item in classes if isinstance(item, dict)]


def extract_vods(data: dict[str, Any]) -> list[dict[str, Any]]:
    vods = data.get("list") or []
    if not isinstance(vods, list):
        return []
    return [item for item in vods if isinstance(item, dict)]


def extract_play_urls(vod: dict[str, Any]) -> list[str]:
    raw = str(vod.get("vod_play_url") or "")
    urls: list[str] = []
    for group in raw.split("$$$"):
        for episode in group.split("#"):
            if "$" in episode:
                candidate = episode.rsplit("$", 1)[1].strip()
            else:
                candidate = episode.strip()
            if candidate.startswith("http") and MEDIA_EXT_RE.search(candidate):
                urls.append(candidate)
    # Stable de-dupe preserving order.
    seen: set[str] = set()
    unique: list[str] = []
    for url in urls:
        if url not in seen:
            unique.append(url)
            seen.add(url)
    return unique


def playlist_entries(text: str) -> list[str]:
    entries: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        entries.append(line)
    return entries


def measure_media(url: str, timeout: float, min_kbps: float) -> dict[str, Any]:
    if ".m3u8" in urllib.parse.urlsplit(url).path.lower():
        playlist_text, playlist = fetch_text(url, timeout, max_bytes=512_000)
        if playlist.code >= 400 or not playlist_text.strip():
            raise ValidationError(f"playlist fetch failed code={playlist.code} url={url}")
        entries = playlist_entries(playlist_text)
        if not entries:
            raise ValidationError(f"playlist has no media entries url={url}")
        nested_or_segment = urllib.parse.urljoin(playlist.url, entries[0])
        if ".m3u8" in urllib.parse.urlsplit(nested_or_segment).path.lower():
            nested_text, nested = fetch_text(nested_or_segment, timeout, max_bytes=512_000)
            entries = playlist_entries(nested_text)
            if not entries:
                raise ValidationError(f"nested playlist has no media entries url={nested_or_segment}")
            media_url = urllib.parse.urljoin(nested.url, entries[0])
        else:
            media_url = nested_or_segment
        media = fetch(media_url, timeout, max_bytes=2_000_000)
    else:
        media = fetch(url, timeout, max_bytes=2_000_000, headers={"Range": "bytes=0-1999999"})
        media_url = media.url
    if media.code >= 400:
        raise ValidationError(f"media fetch failed code={media.code} url={media_url}")
    size = len(media.body)
    if size < 1024:
        raise ValidationError(f"media response too small size={size} url={media_url}")
    kbps = (size * 8 / 1000) / max(media.elapsed, 0.001)
    if kbps < min_kbps:
        raise ValidationError(f"media speed too slow {kbps:.0f} kbps < {min_kbps:.0f} kbps url={media_url}")
    return {"media_url": media_url, "bytes": size, "seconds": media.elapsed, "kbps": kbps, "code": media.code}


def validate_cms_site(site: dict[str, Any], timeout: float, min_kbps: float) -> dict[str, Any]:
    api = str(site.get("api") or "")
    if not api.startswith("http"):
        raise ValidationError(f"site api is not HTTP CMS: {api}")

    list_text, list_res = fetch_text(add_query(api, {"ac": "list"}), timeout, max_bytes=1_000_000)
    if list_res.code >= 400:
        raise ValidationError(f"class list HTTP {list_res.code}")
    class_data = parse_json_response(list_text, "class list")
    classes = extract_classes(class_data)
    if not classes:
        raise ValidationError("class list is empty")

    vod_text, vod_res = fetch_text(add_query(api, {"ac": "videolist", "pg": "1"}), timeout, max_bytes=2_000_000)
    if vod_res.code >= 400:
        raise ValidationError(f"videolist HTTP {vod_res.code}")
    vod_data = parse_json_response(vod_text, "videolist")
    vods = extract_vods(vod_data)
    if not vods:
        raise ValidationError("videolist is empty")

    tested_details = 0
    last_detail_error = ""
    play_errors: list[str] = []
    for vod in vods[:15]:
        vod_id = str(vod.get("vod_id") or "").strip()
        if not vod_id:
            continue
        try:
            detail_text, detail_res = fetch_text(add_query(api, {"ac": "detail", "ids": vod_id}), timeout, max_bytes=3_000_000)
            if detail_res.code >= 400:
                last_detail_error = f"detail HTTP {detail_res.code} id={vod_id}"
                continue
            detail_data = parse_json_response(detail_text, f"detail id={vod_id}")
            detail_vods = extract_vods(detail_data)
            tested_details += len(detail_vods)
            play_urls: list[str] = []
            for detail_vod in detail_vods[:3]:
                play_urls.extend(extract_play_urls(detail_vod))
            if not play_urls:
                play_errors.append(f"id={vod_id}: no direct m3u8/mp4/ts play URL")
                continue
            for play_url in play_urls[:8]:
                try:
                    media_result = measure_media(play_url, timeout, min_kbps)
                    return {
                        "key": site.get("key"),
                        "name": site.get("name"),
                        "api": api,
                        "classes": len(classes),
                        "vods": len(vods),
                        "details": tested_details,
                        "play_urls": len(play_urls),
                        "tested_play_url": play_url,
                        "media": media_result,
                    }
                except Exception as exc:
                    play_errors.append(f"id={vod_id} {play_url}: {exc}")
        except Exception as exc:  # keep trying a few list items
            last_detail_error = str(exc)
    if tested_details == 0:
        raise ValidationError(f"detail list is empty; last={last_detail_error}")
    raise ValidationError("no playable media passed speed test; " + " | ".join(play_errors[:5]))


def probe_non_cms(timeout: float, config_path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for candidate in NON_CMS_CANDIDATES:
        row = dict(candidate)
        try:
            summary = validate_type3_deps(candidate, timeout, config_path)
            row["checks"] = "; ".join(summary["checks"]) if summary["checks"] else "no-dependency"
            row["deps_ok"] = True
            row["playback"] = summary["playback"]
        except Exception as exc:
            row["checks"] = f"ERR:{type(exc).__name__}:{exc}"
            row["deps_ok"] = False
            row["playback"] = "not-executed"
        rows.append(row)
    return rows


def validate_type3_deps(site: dict[str, Any], timeout: float, config_path: Path) -> dict[str, Any]:
    api = str(site.get("api") or "")
    jar = str(site.get("jar") or "")
    ext = str(site.get("ext") or "")
    checks: list[str] = []
    jar_body: bytes | None = None
    if api.startswith("http"):
        res = fetch(api, timeout, max_bytes=256_000)
        if res.code >= 400 or not res.body:
            raise ValidationError(f"api dependency failed code={res.code} bytes={len(res.body)} url={api}")
        checks.append(f"api=HTTP{res.code}/{len(res.body)}B")
    elif api_asset := asset_path(api, config_path):
        body = api_asset.read_bytes()
        if not body:
            raise ValidationError(f"api asset is empty: {api}")
        checks.append(f"api=assets/{api_asset.name}/{len(body)}B")
    elif not (api.startswith("csp_") or api.endswith(".js") or api.endswith(".py") or api.startswith("assets")):
        raise ValidationError(f"unsupported type=3 api: {api}")

    if jar:
        jar_url = dependency_url(jar)
        if jar_url.startswith("./"):
            raise ValidationError(f"jar is relative and not self-contained: {jar}")
        if jar_url.startswith("http"):
            res = fetch(jar_url, timeout, max_bytes=512_000)
            if res.code >= 400:
                raise ValidationError(f"jar HTTP {res.code}: {jar_url}")
            if not looks_like_jar(res.body):
                sample = res.body[:16].decode("ascii", errors="replace").replace("\r", "\\r").replace("\n", "\\n")
                raise ValidationError(f"jar is not a JAR/DEX: {jar_url} sample={sample!r}")
            jar_body = res.body
            checks.append(f"jar=HTTP{res.code}/{len(res.body)}B")
        elif jar_asset := asset_path(jar_url, config_path):
            body = jar_asset.read_bytes()
            if not looks_like_jar(body):
                sample = body[:16].decode("ascii", errors="replace").replace("\r", "\\r").replace("\n", "\\n")
                raise ValidationError(f"jar asset is not a JAR/DEX: {jar} sample={sample!r}")
            jar_body = body
            checks.append(f"jar=assets/{jar_asset.name}/{len(body)}B")
        elif not jar_url.startswith("assets"):
            raise ValidationError(f"unsupported jar location: {jar}")

    if api.startswith("csp_") and jar_body is not None:
        class_name = api.split("csp_", 1)[1]
        if not jar_has_spider_class(jar_body, class_name):
            raise ValidationError(f"jar does not contain Spider class com.github.catvod.spider.{class_name}")
        checks.append(f"class={class_name}")

    if ext:
        ext_url = ext.strip()
        if ext_url.startswith("./"):
            raise ValidationError(f"ext is relative and not self-contained: {ext}")
        if ext_url.startswith("http"):
            res = fetch(ext_url, timeout, max_bytes=512_000)
            if res.code >= 400 or not res.body:
                raise ValidationError(f"ext dependency failed code={res.code} bytes={len(res.body)} url={ext_url}")
            checks.append(f"ext=HTTP{res.code}/{len(res.body)}B")
        elif ext_asset := asset_path(ext_url, config_path):
            body = ext_asset.read_bytes()
            if not body:
                raise ValidationError(f"ext asset is empty: {ext}")
            checks.append(f"ext=assets/{ext_asset.name}/{len(body)}B")

    return {"key": site.get("key"), "name": site.get("name"), "api": api, "checks": checks, "playback": "not-executed"}


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--keys", nargs="*", default=[])
    parser.add_argument("--min-kbps", type=float, default=300.0)
    parser.add_argument("--timeout", type=float, default=15.0)
    parser.add_argument("--probe-candidates", action="store_true")
    parser.add_argument("--require-valid-deps", action="store_true")
    args = parser.parse_args(argv)

    try:
        config = load_config(args.config)
        sites = site_map(config)
        failures: list[str] = []
        if args.keys:
            for key in args.keys:
                site = sites.get(key)
                if site is None:
                    failures.append(f"missing source key: {key}")
                    continue
                try:
                    if int(site.get("type", 1)) == 3:
                        summary = validate_type3_deps(site, args.timeout, args.config)
                        print("PASS_DEPS", summary["key"], " ".join(summary["checks"]), f"playback={summary['playback']}")
                    else:
                        summary = validate_cms_site(site, args.timeout, args.min_kbps)
                        media = summary["media"]
                        print(
                            "PASS",
                            summary["key"],
                            f"classes={summary['classes']}",
                            f"vods={summary['vods']}",
                            f"details={summary['details']}",
                            f"play_urls={summary['play_urls']}",
                            f"speed={media['kbps']:.0f}kbps",
                            f"bytes={media['bytes']}",
                            f"media={media['media_url']}",
                        )
                except Exception as exc:
                    failures.append(f"{key}: {exc}")

        if args.probe_candidates:
            print("NON_CMS_CANDIDATE_PROBE_BEGIN")
            for row in probe_non_cms(args.timeout, args.config):
                print(f"PROBE {row['key']} name={row['name']} api={row['api']} deps_ok={row['deps_ok']} checks={row['checks']} playback={row['playback']}")
                if args.require_valid_deps and not row["deps_ok"]:
                    failures.append(f"{row['key']}: dependency probe failed: {row['checks']}")
            print("NON_CMS_CANDIDATE_PROBE_END")

        if failures:
            for failure in failures:
                eprint("FAIL", failure)
            return 1
        if not args.keys and not args.probe_candidates:
            print(f"PASS config parsed sites={len(sites)}")
        return 0
    except Exception as exc:
        eprint("FAIL", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
