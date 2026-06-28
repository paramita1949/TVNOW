#!/usr/bin/env node

const https = require("https");
const crypto = require("crypto");
const { URL } = require("url");

const BASE = "https://ttp231.shop";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

const CATEGORY_NAMES = [
  "国产视频",
  "中文字幕",
  "高清欧美",
  "欧美视频",
  "性吧日本",
  "去码重生",
  "无码视频",
  "有码视频",
];

function parseArgs(argv) {
  const args = {
    maxPages: 2,
    details: 20,
    search: "",
    timeoutMs: 20000,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--max-pages") {
      args.maxPages = next === "all" ? 0 : Number(next);
      i++;
    } else if (arg === "--details") {
      args.details = next === "all" ? 0 : Number(next);
      i++;
    } else if (arg === "--search") {
      args.search = next || "";
      i++;
    } else if (arg === "--timeout-ms") {
      args.timeoutMs = Number(next);
      i++;
    } else if (arg === "--help") {
      console.log(
        [
          "Usage: node scripts/ttp231_probe.js [--max-pages N|all] [--details N|all] [--search KEYWORD]",
          "",
          "Examples:",
          "  node scripts/ttp231_probe.js --max-pages 2 --details 20 --search MISSCAT",
          "  node scripts/ttp231_probe.js --max-pages all --details all",
        ].join("\n"),
      );
      process.exit(0);
    }
  }
  if (!Number.isFinite(args.maxPages) || args.maxPages < 0) throw new Error("Invalid --max-pages");
  if (!Number.isFinite(args.details) || args.details < 0) throw new Error("Invalid --details");
  return args;
}

function request(url, headers = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request(
      {
        hostname: target.hostname,
        path: target.pathname + target.search,
        method: "GET",
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timeout ${url}`)));
    req.end();
  });
}

function parseSetCookies(setCookie) {
  const cookies = {};
  for (const raw of setCookie || []) {
    const pair = String(raw).split(";")[0];
    const idx = pair.indexOf("=");
    if (idx > 0) cookies[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return cookies;
}

function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function absoluteUrl(value) {
  if (!value) return "";
  return new URL(value.replace(/&amp;/g, "&"), BASE).href;
}

function stripTags(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function decryptEncryptedHtml(html) {
  const match = html.match(
    /var\s+([A-Za-z_$][\w$]*)\s*=\s*"([^"]+)"\s*,\s*([A-Za-z_$][\w$]*)\s*=\s*\[([^\]]+)\]/s,
  );
  if (!match) return html;

  const encryptedReversedBase64 = match[2];
  const keyBase64 = [...match[4].matchAll(/"([^"]+)"/g)]
    .map((item) => Buffer.from(item[1], "base64").toString("utf8"))
    .join("");
  const key = Buffer.from(keyBase64, "base64");
  const packed = Buffer.from(encryptedReversedBase64.split("").reverse().join(""), "base64");
  const bits = { 16: 128, 24: 192, 32: 256 }[key.length];
  if (!bits) throw new Error(`Unsupported AES key length: ${key.length}`);

  const decipher = crypto.createDecipheriv(`aes-${bits}-ctr`, key, packed.subarray(0, 16));
  return Buffer.concat([decipher.update(packed.subarray(16)), decipher.final()]).toString("utf8");
}

async function fetchDecoded(url, args) {
  const first = await request(url, {}, args.timeoutMs);
  const cookies = parseSetCookies(first.headers["set-cookie"]);
  if (cookies.Challenge) cookies[`UID_${cookies.Challenge}`] = "ok";
  const second = await request(
    url,
    {
      Cookie: cookieHeader(cookies),
      Referer: url,
    },
    args.timeoutMs,
  );
  return {
    status: second.status,
    html: decryptEncryptedHtml(second.body),
    challenge: cookies.Challenge || "",
  };
}

function parseTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : "";
}

function parseCategories(html) {
  const byName = new Map();
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']*\/videos\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const name = stripTags(match[2]).replace(/更多.*/, "").trim();
    if (CATEGORY_NAMES.includes(name) && !byName.has(name)) {
      byName.set(name, {
        type_id: `/videos/${encodeURIComponent(name)}`,
        type_name: name,
        url: absoluteUrl(match[1]),
      });
    }
  }
  return CATEGORY_NAMES.filter((name) => byName.has(name)).map((name) => byName.get(name));
}

function parseMaxPage(html) {
  let maxPage = 1;
  for (const match of html.matchAll(/[?&]page=(\d+)/gi)) {
    maxPage = Math.max(maxPage, Number(match[1]));
  }
  return maxPage;
}

function parseVideos(html) {
  const videos = [];
  for (const match of html.matchAll(
    /<a\b([^>]*href=["'][^"']*\/video\/\d+\.html[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi,
  )) {
    const tag = match[1];
    const inner = match[2];
    const href = tag.match(/href=["']([^"']+)/i)?.[1] || "";
    if (!href) continue;
    const id = absoluteUrl(href).match(/\/video\/(\d+)\.html/i)?.[1] || absoluteUrl(href);
    if (videos.some((item) => item.vod_id === id)) continue;
    const title = tag.match(/title=["']([^"']+)/i)?.[1] || stripTags(inner);
    const pic =
      inner.match(/data-src=["']([^"']+)/i)?.[1] ||
      inner.match(/data-original=["']([^"']+)/i)?.[1] ||
      inner.match(/src=["']([^"']+)/i)?.[1] ||
      "";
    const date = inner.match(/<i[^>]*class=["'][^"']*time[^"']*["'][^>]*>([\s\S]*?)<\/i>/i)?.[1] || "";
    videos.push({
      vod_id: id,
      vod_name: stripTags(title).replace(/\s+\d{4}-\d{2}-\d{2}$/, ""),
      vod_pic: absoluteUrl(pic),
      vod_remarks: stripTags(date),
      url: absoluteUrl(href),
    });
  }
  return videos;
}

function extractPlayableUrl(html) {
  const ckUrl = [...html.matchAll(/https?:\/\/[^"'<>\\\s]+\/ck\/\?url=([^"'<>\\\s&]+)[^"'<>\\\s]*/gi)]
    .map((match) => decodeURIComponent(match[1].replace(/&amp;/g, "&")))[0];
  if (ckUrl) return ckUrl;
  return [...html.matchAll(/https?:\/\/[^"'<>\\\s]+?\.m3u8[^"'<>\\\s]*/gi)].map((match) =>
    match[0].replace(/&amp;/g, "&"),
  )[0];
}

async function verifyM3u8(url, args) {
  if (!url) return { ok: false, status: 0, bytes: 0, contentType: "", error: "empty url" };
  try {
    const result = await request(
      url,
      {
        Referer: "https://surumi.shop/",
        Accept: "application/vnd.apple.mpegurl,*/*",
      },
      args.timeoutMs,
    );
    return {
      ok: result.status === 200 && result.body.startsWith("#EXTM3U"),
      status: result.status,
      bytes: Buffer.byteLength(result.body),
      contentType: result.headers["content-type"] || "",
      error: "",
    };
  } catch (error) {
    return { ok: false, status: 0, bytes: 0, contentType: "", error: error.message };
  }
}

async function collectCategory(category, args) {
  const first = await fetchDecoded(category.url, args);
  const discoveredMaxPage = parseMaxPage(first.html);
  const pagesToFetch =
    args.maxPages === 0 ? discoveredMaxPage : Math.max(1, Math.min(args.maxPages, discoveredMaxPage));
  const videos = parseVideos(first.html);
  const pageResults = [
    {
      page: 1,
      url: category.url,
      count: videos.length,
    },
  ];

  for (let page = 2; page <= pagesToFetch; page++) {
    const pageUrl = `${category.url}?page=${page}`;
    const result = await fetchDecoded(pageUrl, args);
    const pageVideos = parseVideos(result.html);
    for (const item of pageVideos) {
      if (!videos.some((video) => video.vod_id === item.vod_id)) videos.push(item);
    }
    pageResults.push({
      page,
      url: pageUrl,
      count: pageVideos.length,
    });
  }

  return {
    ...category,
    discoveredMaxPage,
    pagesFetched: pageResults.length,
    pageResults,
    videos,
  };
}

async function collectDetail(video, args) {
  const result = await fetchDecoded(video.url, args);
  const playableUrl = extractPlayableUrl(result.html);
  const verify = await verifyM3u8(playableUrl, args);
  return {
    vod_id: video.vod_id,
    vod_name: video.vod_name,
    detailStatus: result.status,
    detailTitle: parseTitle(result.html),
    playableUrl,
    playable: verify.ok,
    m3u8Status: verify.status,
    m3u8Bytes: verify.bytes,
    m3u8ContentType: verify.contentType,
    error: verify.error,
  };
}

async function collectSearch(keyword, args) {
  if (!keyword) return null;
  const url = `${BASE}/search/${encodeURIComponent(keyword)}`;
  const result = await fetchDecoded(url, args);
  return {
    keyword,
    url,
    status: result.status,
    title: parseTitle(result.html),
    count: parseVideos(result.html).length,
    samples: parseVideos(result.html).slice(0, 10),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();

  const home = await fetchDecoded(`${BASE}/`, args);
  const categories = parseCategories(home.html);
  if (!categories.length) throw new Error("No categories parsed from home page");

  const categoryResults = [];
  const allVideos = [];
  for (const category of categories) {
    const result = await collectCategory(category, args);
    categoryResults.push({
      type_id: result.type_id,
      type_name: result.type_name,
      discoveredMaxPage: result.discoveredMaxPage,
      pagesFetched: result.pagesFetched,
      pageCounts: result.pageResults.map((page) => page.count),
      uniqueVideos: result.videos.length,
      samples: result.videos.slice(0, 5),
    });
    for (const video of result.videos) {
      if (!allVideos.some((item) => item.vod_id === video.vod_id)) allVideos.push(video);
    }
  }

  const detailLimit = args.details === 0 ? allVideos.length : Math.min(args.details, allVideos.length);
  const detailResults = [];
  for (const video of allVideos.slice(0, detailLimit)) {
    detailResults.push(await collectDetail(video, args));
  }

  const search = await collectSearch(args.search, args);
  const endedAt = new Date().toISOString();
  const output = {
    base: BASE,
    startedAt,
    endedAt,
    options: args,
    home: {
      status: home.status,
      title: parseTitle(home.html),
    },
    categories: {
      count: categories.length,
      names: categories.map((item) => item.type_name),
      results: categoryResults,
    },
    resources: {
      uniqueVideoCount: allVideos.length,
      sample: allVideos.slice(0, 12),
    },
    details: {
      requested: detailLimit,
      checked: detailResults.length,
      playable: detailResults.filter((item) => item.playable).length,
      failed: detailResults.filter((item) => !item.playable).length,
      results: detailResults,
    },
    search,
  };
  console.log(JSON.stringify(output, null, 2));

  if (!output.categories.count || !output.resources.uniqueVideoCount) process.exit(2);
  if (detailLimit > 0 && output.details.playable === 0) process.exit(3);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
