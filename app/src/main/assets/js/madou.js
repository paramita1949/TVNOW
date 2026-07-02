export const BASE = 'https://madou.club';
export const DASH_BASE = 'https://dash.madou.club';
export const SOURCE = '麻豆社';
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

export const CATEGORIES = [
  { type_id: 'latest', type_name: '最新更新' },
  { type_id: 'madou_media', type_name: '麻豆传媒' },
  { type_id: 'madou_extra', type_name: '麻豆番外篇' },
  { type_id: 'madou_bts', type_name: '麻豆花絮' },
  { type_id: 'hongkongdoll', type_name: 'HongKongDoll' },
  { type_id: 'psychoporntw', type_name: 'PsychopornTW' },
  { type_id: 'studio_91', type_name: '91制片厂' },
  { type_id: 'guodong', type_name: '果冻传媒' },
  { type_id: 'mitao', type_name: '蜜桃影像' },
  { type_id: 'tianmei', type_name: '天美传媒' },
  { type_id: 'huangjia', type_name: '皇家华人' },
  { type_id: 'tuzi', type_name: '兔子先生' },
  { type_id: 'xingkong', type_name: '星空无限传媒' },
  { type_id: 'aidou', type_name: '爱豆' },
  { type_id: 'daxiang', type_name: '大象传媒' },
  { type_id: 'maozhua', type_name: '猫爪影像' },
  { type_id: 'jingdong', type_name: '精东影业' },
  { type_id: 'xingba', type_name: '杏吧' },
  { type_id: 'lebo', type_name: '乐播传媒' },
  { type_id: 'caomei', type_name: '草莓' },
  { type_id: 'douyin', type_name: '抖阴' },
];

const CATEGORY_PATHS = {
  latest: '/',
  madou_media: '/category/%e9%ba%bb%e8%b1%86%e4%bc%a0%e5%aa%92',
  madou_extra: '/category/%e9%ba%bb%e8%b1%86%e7%95%aa%e5%a4%96%e7%af%87',
  madou_bts: '/category/%e9%ba%bb%e8%b1%86%e8%8a%b1%e7%b5%ae',
  hongkongdoll: '/category/hongkongdoll',
  psychoporntw: '/category/psychoporntw',
  studio_91: '/category/91%e5%88%b6%e7%89%87%e5%8e%82',
  guodong: '/category/%e6%9e%9c%e5%86%bb%e4%bc%a0%e5%aa%92',
  mitao: '/category/%e8%9c%9c%e6%a1%83%e5%bd%b1%e5%83%8f',
  tianmei: '/category/%e5%a4%a9%e7%be%8e%e4%bc%a0%e5%aa%92',
  huangjia: '/category/%e7%9a%87%e5%ae%b6%e5%8d%8e%e4%ba%ba',
  tuzi: '/category/%e5%85%94%e5%ad%90%e5%85%88%e7%94%9f',
  xingkong: '/category/%e6%98%9f%e7%a9%ba%e6%97%a0%e9%99%90%e4%bc%a0%e5%aa%92',
  aidou: '/category/%e7%88%b1%e8%b1%86',
  daxiang: '/category/%e5%a4%a7%e8%b1%a1%e4%bc%a0%e5%aa%92',
  maozhua: '/category/%e7%8c%ab%e7%88%aa%e5%bd%b1%e5%83%8f',
  jingdong: '/category/%e7%b2%be%e4%b8%9c%e5%bd%b1%e4%b8%9a',
  xingba: '/category/%e6%9d%8f%e5%90%a7',
  lebo: '/category/%e4%b9%90%e6%92%ad%e4%bc%a0%e5%aa%92',
  caomei: '/category/%e8%8d%89%e8%8e%93',
  douyin: '/category/%e6%8a%96%e9%98%b4',
};

const CACHE_BY_ID = {};
const PLAY_REFERER_BY_URL = {};

function toJson(value) {
  return JSON.stringify(value);
}

function safeText(value) {
  return value == null ? '' : String(value).trim();
}

function safePage(page) {
  const num = parseInt(page || '1', 10);
  return Number.isFinite(num) && num > 0 ? num : 1;
}

function responseContent(res) {
  if (!res) return '';
  if (typeof res === 'string') return res;
  if (typeof res.content === 'string') return res.content;
  return '';
}

function htmlDecode(text) {
  return safeText(text)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'");
}

function stripHtml(text) {
  return htmlDecode(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUrl(url, base = BASE) {
  const value = htmlDecode(url);
  if (!value) return '';
  if (value.startsWith('//')) return `https:${value}`;
  try {
    const root = base.endsWith('/') ? base : `${base}/`;
    return new URL(value, root).href;
  } catch (e) {
    return value;
  }
}

function pagePath(path, page) {
  const pg = safePage(page);
  if (pg <= 1) return path;
  if (path === '/') return `/page/${pg}/`;
  return `${path.replace(/\/$/, '')}/page/${pg}/`;
}

export function buildCategoryUrl(tid, pg) {
  const id = safeText(tid) || 'latest';
  const path = CATEGORY_PATHS[id] || CATEGORY_PATHS.latest;
  return `${BASE}${pagePath(path, pg)}`;
}

export function buildSearchUrl(key, pg) {
  const page = safePage(pg);
  const query = encodeURIComponent(safeText(key));
  return page <= 1 ? `${BASE}/?s=${query}` : `${BASE}/page/${page}/?s=${query}`;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return htmlDecode(match[1]);
  }
  return '';
}

function compactVod(row) {
  const id = normalizeUrl(row && (row.id || row.url || row.href));
  const vod = {
    id,
    name: safeText(row && (row.name || row.title)),
    pic: normalizeUrl(row && (row.pic || row.img || row.vod_pic)),
    remarks: safeText(row && (row.remarks || row.remark || row.vod_remarks)),
    content: safeText(row && (row.content || row.desc || row.vod_content)),
    tags: safeText(row && row.tags),
    shareUrl: normalizeUrl(row && row.shareUrl, DASH_BASE),
    playUrl: normalizeUrl(row && row.playUrl, DASH_BASE),
    playReferer: normalizeUrl(row && row.playReferer, DASH_BASE),
  };
  if (vod.id) CACHE_BY_ID[vod.id] = vod;
  if (vod.playUrl && vod.playReferer) PLAY_REFERER_BY_URL[vod.playUrl] = vod.playReferer;
  return vod;
}

function rememberVod(row) {
  return compactVod(row);
}

export function encodeVodId(row) {
  return `madou:${encodeURIComponent(JSON.stringify(compactVod(row)))}`;
}

export function decodeVodId(id) {
  const text = Array.isArray(id) ? id[0] : id;
  const value = safeText(text);
  if (value.startsWith('madou:')) {
    try {
      const vod = JSON.parse(decodeURIComponent(value.slice(6)));
      if (vod && vod.id) CACHE_BY_ID[vod.id] = vod;
      if (vod && vod.playUrl && vod.playReferer) PLAY_REFERER_BY_URL[vod.playUrl] = vod.playReferer;
      return vod || {};
    } catch (e) {
      return {};
    }
  }
  return CACHE_BY_ID[value] || { id: normalizeUrl(value) };
}

function parseArticle(block) {
  const href = firstMatch(block, [
    /<h2[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+\.html)["'][^>]*>/i,
    /<a[^>]+class=["'][^"']*thumbnail[^"']*["'][^>]+href=["']([^"']+\.html)["']/i,
    /href=["']([^"']+\.html)["']/i,
  ]);
  const title = stripHtml(
    firstMatch(block, [
      /<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i,
      /<a[^>]+title=["']([^"']+)["']/i,
    ])
  );
  const pic =
    firstMatch(block, [
      /<img[^>]+data-src=["']([^"']+)["']/i,
      /<img[^>]+data-original=["']([^"']+)["']/i,
      /<img[^>]+src=["']([^"']+)["']/i,
    ]) || '';
  const view = stripHtml(firstMatch(block, [/<span[^>]+class=["'][^"']*post-view[^"']*["'][^>]*>([\s\S]*?)<\/span>/i]));
  const hot = stripHtml(firstMatch(block, [/<time[^>]*class=["'][^"']*hot[^"']*["'][^>]*>([\s\S]*?)<\/time>/i]));
  const category = stripHtml(firstMatch(block, [/<a[^>]+rel=["']category tag["'][^>]*>([\s\S]*?)<\/a>/i]));
  const remarks = view || hot || category;
  if (!href || !title) return null;
  return rememberVod({
    id: normalizeUrl(href),
    name: title,
    pic: normalizeUrl(pic),
    remarks,
    tags: category,
  });
}

export function parseListFromHtml(html) {
  const rows = [];
  const seen = {};
  for (const match of String(html || '').matchAll(/<article\b[\s\S]*?<\/article>/gi)) {
    const row = parseArticle(match[0]);
    if (!row || !row.id || !row.name || seen[row.id]) continue;
    seen[row.id] = true;
    rows.push(row);
  }
  return rows;
}

function parseTags(html) {
  const tags = [];
  const blocks = String(html || '').match(/<div[^>]+class=["'][^"']*article-tags[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  if (blocks) {
    for (const match of blocks[0].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)) {
      const tag = stripHtml(match[1]);
      if (tag) tags.push(tag);
    }
  }
  const category = stripHtml(firstMatch(html, [/<span[^>]+class=["'][^"']*item-3[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/span>/i]));
  if (category) tags.unshift(category);
  return [...new Set(tags)].join(',');
}

export function parseDetailFromHtml(html, fallback = {}) {
  const base = compactVod(fallback || {});
  const title = stripHtml(
    firstMatch(html, [
      /<h1[^>]+class=["'][^"']*article-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ])
  )
    .replace(/[-_]?麻豆社.*$/i, '')
    .trim();
  const desc = stripHtml(firstMatch(html, [/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i]));
  const view = stripHtml(firstMatch(html, [/<span[^>]+class=["'][^"']*item-4[^"']*["'][^>]*>([\s\S]*?)<\/span>/i]));
  const shareRaw = firstMatch(html, [
    /<iframe[^>]+src=["']([^"']*dash\.madou\.club\/share\/[^"'\s>]+)["']/i,
    /<iframe[^>]+src=([^"'\s>]*dash\.madou\.club\/share\/[^"'\s>]+)/i,
  ]);
  const tags = parseTags(html);
  return rememberVod({
    ...base,
    name: title || base.name,
    remarks: view || base.remarks,
    content: desc || base.content || title || base.name,
    tags: tags || base.tags,
    shareUrl: normalizeUrl(shareRaw, DASH_BASE),
  });
}

export function parseShareFromHtml(html, shareUrl = '') {
  const token = firstMatch(html, [/var\s+token\s*=\s*["']([^"']*)["']/i]);
  const m3u8 = firstMatch(html, [/var\s+m3u8\s*=\s*["']([^"']+)["']/i]);
  const pic = firstMatch(html, [/pic\s*:\s*["']([^"']+)["']/i]);
  const title = stripHtml(firstMatch(html, [/<title[^>]*>([\s\S]*?)<\/title>/i])).replace(/在线播放$/, '');
  let url = normalizeUrl(m3u8, DASH_BASE);
  if (url && token) url = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  const referer = normalizeUrl(shareUrl, DASH_BASE);
  if (url && referer) PLAY_REFERER_BY_URL[url] = referer;
  return {
    url,
    pic: normalizeUrl(pic, DASH_BASE),
    title,
    referer,
  };
}

export function formatVodItem(row) {
  const vod = compactVod(row);
  return {
    vod_id: encodeVodId(vod),
    vod_name: vod.name,
    vod_pic: vod.pic,
    vod_remarks: vod.remarks,
  };
}

export function formatVodDetail(row, originalId) {
  const vod = compactVod(row);
  const playUrl = vod.playUrl ? `线路1$${vod.playUrl}` : '';
  const content = [
    vod.content && vod.content !== vod.name ? vod.content : '',
    vod.tags ? `标签：${vod.tags}` : '',
    vod.remarks ? vod.remarks : '',
    `来源：${SOURCE}`,
  ]
    .filter(Boolean)
    .join('\n');
  return {
    vod_id: originalId || encodeVodId(vod),
    vod_name: vod.name || vod.id,
    type_name: vod.tags,
    vod_pic: vod.pic,
    vod_remarks: vod.remarks,
    vod_content: content,
    vod_play_from: SOURCE,
    vod_play_url: playUrl,
  };
}

function requestHtml(url, referer) {
  const http = typeof req === 'function' ? req : globalThis.req;
  if (typeof http !== 'function') return '';
  try {
    const target = normalizeUrl(url);
    const res = http(target, {
      timeout: 20000,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        Referer: referer || `${BASE}/`,
      },
    });
    return responseContent(res);
  } catch (e) {
    return '';
  }
}

function hasNextPage(html) {
  return /<li[^>]+class=["'][^"']*next-page[^"']*["'][^>]*>\s*<a\b/i.test(String(html || ''));
}

function mapList(html, page) {
  const list = parseListFromHtml(html).map(formatVodItem).filter((item) => item.vod_id && item.vod_name && item.vod_pic);
  const pagecount = hasNextPage(html) ? page + 1 : page;
  const limit = list.length || 20;
  return toJson({
    page,
    pagecount,
    limit,
    total: pagecount * limit,
    list,
  });
}

const spider = {
  init() {},
  home(filter) {
    return toJson({ class: CATEGORIES.map((item) => ({ type_id: item.type_id, type_name: item.type_name })) });
  },
  homeVod() {
    const html = requestHtml(buildCategoryUrl('latest', 1), `${BASE}/`);
    return toJson({ list: parseListFromHtml(html).map(formatVodItem) });
  },
  category(tid, pg, filter, extend) {
    const page = safePage(pg);
    const html = requestHtml(buildCategoryUrl(tid, page), `${BASE}/`);
    return mapList(html, page);
  },
  detail(id) {
    const originalId = Array.isArray(id) ? id[0] : id;
    const cached = decodeVodId(originalId);
    const detailHtml = requestHtml(cached.id, `${BASE}/`);
    const detail = parseDetailFromHtml(detailHtml, cached);
    if (!detail.shareUrl) return toJson({ list: [] });
    const shareHtml = requestHtml(detail.shareUrl, detail.id || `${BASE}/`);
    const share = parseShareFromHtml(shareHtml, detail.shareUrl);
    if (!share.url) return toJson({ list: [] });
    const vod = rememberVod({
      ...detail,
      name: detail.name || share.title,
      pic: detail.pic || share.pic,
      playUrl: share.url,
      playReferer: share.referer || detail.shareUrl,
    });
    return toJson({ list: [formatVodDetail(vod, originalId)] });
  },
  play(flag, id) {
    const url = normalizeUrl(id, DASH_BASE);
    return toJson({
      parse: 0,
      flag,
      url,
      header: {
        'User-Agent': UA,
        Referer: PLAY_REFERER_BY_URL[url] || `${DASH_BASE}/`,
      },
    });
  },
  search(key, quick, pg) {
    const page = safePage(pg);
    const html = requestHtml(buildSearchUrl(key, page), `${BASE}/`);
    return mapList(html, page);
  },
  destroy() {},
};

export function __jsEvalReturn() {
  return spider;
}

export default spider;
