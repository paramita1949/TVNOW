export const BASE = 'https://xgs262.shop';
export const SOURCE = '西瓜';
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149 Safari/537.36';

export const CATEGORIES = [
  ['国产视频', '国产视频'],
  ['中文字幕', '中文字幕'],
  ['有码视频', '有码视频'],
  ['有码破解', '有码破解'],
  ['动漫视频', '动漫视频'],
  ['欧美视频', '欧美视频'],
];

const SEED_VODS = [
  {
    vod_id: '384764',
    vod_name: 'PAP-158 中高年世代へ捧げる昭和官能ラマ7编×4时间',
    vod_pic: 'https://xgs262.shop/thumb/ck/212335.jpg',
    vod_remarks: '可播放样片',
  },
];
const SEED_BY_ID = Object.fromEntries(SEED_VODS.map((item) => [item.vod_id, item]));

export function buildGateClick() {
  return "document.querySelector('#checkbox')?.click();document.querySelector('#Link')?.click();";
}

export function htmlDecode(text) {
  if (!text) return '';
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return String(text)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&([a-zA-Z]+);/g, (all, key) => named[key] || all);
}

function stripTags(text) {
  return htmlDecode(String(text || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUrl(url) {
  if (!url) return '';
  url = htmlDecode(url).trim();
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return BASE + url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return BASE + '/' + url.replace(/^\.?\//, '');
}

function toJson(object) {
  return JSON.stringify(object);
}

function safePage(page) {
  const num = parseInt(page || '1', 10);
  return Number.isFinite(num) && num > 0 ? String(num) : '1';
}

function responseContent(res) {
  if (!res) return '';
  if (typeof res === 'string') return res;
  if (typeof res.content === 'string') return res.content;
  return '';
}

function request(url, referer) {
  const http = typeof req === 'function' ? req : globalThis.req;
  if (typeof http !== 'function') return '';
  const target = normalizeUrl(url);
  try {
    const res = http(target, {
      timeout: 20000,
      headers: {
        'User-Agent': UA,
        Referer: referer || BASE + '/',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    return responseContent(res);
  } catch (e) {
    return '';
  }
}

function pageUrl(id) {
  const text = String(id || '').trim();
  if (text.startsWith('http')) return text;
  const match = text.match(/(\d+)/);
  return match ? `${BASE}/video/${match[1]}.html` : normalizeUrl(text);
}

function videoIdFromUrl(url) {
  const match = String(url || '').match(/\/video\/(\d+)\.html/i);
  return match ? match[1] : '';
}

function firstMatch(text, regex) {
  const match = regex.exec(text || '');
  return match ? match[1] : '';
}

function titleFromAnchor(block) {
  const p = firstMatch(block, /<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (p) return stripTags(p);
  const attr = firstMatch(block, /\b(?:title|alt)=["']([^"']+)["']/i);
  if (attr) return stripTags(attr);
  return stripTags(block).replace(/\b20\d{2}-\d{2}-\d{2}\b/g, '').trim();
}

function picFromBlock(block) {
  const pic = firstMatch(block, /\b(?:data-src|src)=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"']*)?)["']/i);
  return normalizeUrl(pic);
}

export function extractVideoItems(html) {
  const items = [];
  const seen = {};
  const regex = /<a\b[^>]*href=["']([^"']*\/video\/(\d+)\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html || ''))) {
    const id = match[2];
    if (!id || seen[id]) continue;
    const block = match[3] || '';
    const name = titleFromAnchor(block);
    if (!name) continue;
    const remarks = firstMatch(block, /\b(20\d{2}-\d{2}-\d{2})\b/);
    seen[id] = true;
    items.push({ vod_id: id, vod_name: name, vod_pic: picFromBlock(block), vod_remarks: remarks });
  }
  return items;
}

function extractH1(html) {
  return firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
}

function extractTypeName(h1) {
  return stripTags(firstMatch(h1, /<a\b[^>]*>([\s\S]*?)<\/a>/i));
}

function extractDetailName(html, h1, typeName, fallbackId) {
  let title = h1.replace(/<a\b[\s\S]*?<\/a>/i, '');
  title = stripTags(title).replace(/^[\s›»>:\-｜|]+/, '').trim();
  if (typeName && title.startsWith(typeName)) title = title.slice(typeName.length).trim();
  if (title) return title;
  title = stripTags(firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i)).split(',')[0].trim();
  if (title && !/最新热门小说网站/.test(title)) return title;
  return `${SOURCE}-${fallbackId}`;
}

function extractDetailPic(html) {
  const thumb = firstMatch(html, /\b(?:data-src|src)=["']([^"']*thumb\/ck\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/i);
  if (thumb) return normalizeUrl(thumb);
  return picFromBlock(html);
}

export function extractVideoDetail(html, id) {
  const vodId = String(id || videoIdFromUrl(html)).match(/\d+/)?.[0] || String(id || '');
  const seed = SEED_BY_ID[vodId] || {};
  const h1 = extractH1(html || '');
  const typeName = extractTypeName(h1) || '';
  const name = h1 ? extractDetailName(html || '', h1 || '', typeName, vodId) : seed.vod_name || extractDetailName(html || '', h1 || '', typeName, vodId);
  return {
    vod_id: vodId,
    vod_name: name,
    type_name: typeName,
    vod_pic: extractDetailPic(html || '') || seed.vod_pic || '',
    vod_content: `${name}\n来源：${SOURCE}`,
    vod_play_from: SOURCE,
    vod_play_url: `播放$${BASE}/video/${vodId}.html`,
  };
}

function categoryUrl(tid, page) {
  const pg = safePage(page);
  const path = `/p/${encodeURIComponent(tid)}`;
  return pg === '1' ? BASE + path : `${BASE}${path}/${pg}.html`;
}

function searchUrl(key, page) {
  const pg = safePage(page);
  const path = `/s/${encodeURIComponent(key)}`;
  return pg === '1' ? BASE + path : `${BASE}${path}/${pg}.html`;
}

function listFromUrl(url) {
  const html = request(url, BASE + '/');
  return extractVideoItems(html);
}

const spider = {
  init() {},
  home(filter) {
    return toJson({ class: CATEGORIES.map(([type_id, type_name]) => ({ type_id, type_name })) });
  },
  homeVod() {
    const list = listFromUrl(BASE + '/');
    return toJson({ list: list.length ? list : SEED_VODS });
  },
  category(tid, pg, filter, extend) {
    const list = listFromUrl(categoryUrl(tid, pg));
    return toJson({ page: parseInt(safePage(pg), 10), pagecount: list.length ? parseInt(safePage(pg), 10) + 1 : parseInt(safePage(pg), 10), limit: 24, total: list.length, list });
  },
  detail(id) {
    const url = pageUrl(id);
    const html = request(url, url);
    const vod = extractVideoDetail(html, videoIdFromUrl(url) || id);
    return toJson({ list: [vod] });
  },
  play(flag, id) {
    const url = normalizeUrl(id);
    const direct = /\.(m3u8|mp4)(?:$|\?)/i.test(url);
    return toJson({
      parse: direct ? 0 : 1,
      url,
      click: buildGateClick(),
      header: { 'User-Agent': UA, Referer: BASE + '/' },
    });
  },
  search(key, quick, pg) {
    const list = listFromUrl(searchUrl(key, pg));
    return toJson({ list });
  },
  destroy() {},
};

export default spider;
