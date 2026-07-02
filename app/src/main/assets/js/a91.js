export const BASE = 'https://a91hlfst.a6cfwbq.com';
export const SOURCE = '抖阴';
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

export const CATEGORIES = [
  { type_id: 'recommend', type_name: '推荐' },
  { type_id: 'selected_all', type_name: '精选全部' },
  { type_id: 'selected_9', type_name: '巨乳' },
  { type_id: 'selected_22', type_name: '嫩妹' },
  { type_id: 'selected_19', type_name: '吃瓜' },
  { type_id: 'selected_21', type_name: '网红' },
  { type_id: 'selected_12', type_name: '抖音风' },
  { type_id: 'selected_20', type_name: 'COS' },
  { type_id: 'selected_24', type_name: '综艺' },
];

const CATEGORY_PATHS = {
  recommend: '/',
  selected_all: '/selected/all/',
  selected_9: '/selected/9/',
  selected_22: '/selected/22/',
  selected_19: '/selected/19/',
  selected_21: '/selected/21/',
  selected_12: '/selected/12/',
  selected_20: '/selected/20/',
  selected_24: '/selected/24/',
};

const CACHE_BY_ID = {};
const NUXT_WRAPPERS = {
  Reactive: true,
  Ref: true,
  ShallowReactive: true,
  ShallowRef: true,
};

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
    .replace(/&apos;/g, "'");
}

export function normalizeUrl(url) {
  const value = safeText(url);
  if (!value) return '';
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${BASE}${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${BASE}/${value.replace(/^\.?\//, '')}`;
}

function addPage(url, page) {
  const pg = safePage(page);
  if (pg <= 1) return url;
  return `${url}${url.includes('?') ? '&' : '?'}page=${pg}`;
}

export function buildCategoryUrl(tid, pg) {
  const id = safeText(tid) || 'recommend';
  const page = safePage(pg);
  const path = CATEGORY_PATHS[id] || CATEGORY_PATHS.recommend;
  const url = normalizeUrl(path);
  if (id === 'recommend') return addPage(url, page);
  return page <= 1 ? url : addPage(url, page);
}

export function buildSearchUrl(key, pg) {
  const page = safePage(pg);
  const query = `search=${encodeURIComponent(safeText(key))}`;
  return `${BASE}/?${query}${page > 1 ? `&page=${page}` : ''}`;
}

function extractNuxtData(html) {
  const match = String(html || '').match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return [];
  try {
    const data = JSON.parse(htmlDecode(match[1]));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function makeNuxtResolver(data) {
  const cache = {};
  const resolving = {};
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function resolve(value, depth) {
    if (depth > 30) return value;
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < data.length) {
      if (hasOwn(cache, value)) return cache[value];
      if (resolving[value]) return data[value];
      resolving[value] = true;
      cache[value] = resolve(data[value], depth + 1);
      resolving[value] = false;
      return cache[value];
    }
    if (Array.isArray(value)) {
      const first = resolve(value[0], depth + 1);
      if (NUXT_WRAPPERS[first]) return resolve(value[1], depth + 1);
      return value.map((item) => resolve(item, depth + 1));
    }
    if (value && typeof value === 'object') {
      const object = {};
      for (const key of Object.keys(value)) object[key] = resolve(value[key], depth + 1);
      return object;
    }
    return value;
  }

  return resolve;
}

function hasPlayableLinks(row) {
  return Array.isArray(row && row.play_links) && row.play_links.some((link) => safeText(link && link.m3u8_url));
}

function compactVod(row) {
  const tags = Array.isArray(row.tags)
    ? row.tags.map((tag) => ({ id: safeText(tag && tag.id), name: safeText(tag && tag.name) })).filter((tag) => tag.name)
    : [];
  const playLinks = Array.isArray(row.play_links)
    ? row.play_links
        .map((link, index) => ({
          name: safeText(link && link.name) || `线路${index + 1}`,
          m3u8_url: normalizeUrl(link && link.m3u8_url),
        }))
        .filter((link) => link.m3u8_url)
    : [];
  return {
    id: safeText(row.id || row.lid),
    name: safeText(row.name),
    description: safeText(row.description),
    img: normalizeUrl(row.img || (row.seo && row.seo.img)),
    click: safeText(row.click),
    love: safeText(row.love),
    favorite: safeText(row.favorite),
    duration: safeText(row.duration),
    show_at: safeText(row.show_at),
    tags,
    play_links: playLinks,
  };
}

function rememberVod(row) {
  const vod = compactVod(row);
  if (vod.id) CACHE_BY_ID[vod.id] = vod;
  return vod;
}

export function parseNuxtMoviesFromHtml(html) {
  const data = extractNuxtData(html);
  if (!data.length) return [];
  const resolve = makeNuxtResolver(data);
  const seen = {};
  const rows = [];
  for (let i = 0; i < data.length; i++) {
    const raw = data[i];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    if (!('id' in raw) || !('name' in raw) || !('img' in raw) || !('play_links' in raw)) continue;
    const row = resolve(raw, 0);
    const vod = rememberVod(row);
    if (!vod.id || !vod.name || !vod.img || !hasPlayableLinks(vod) || seen[vod.id]) continue;
    seen[vod.id] = true;
    rows.push(vod);
  }
  return rows;
}

function parseNuxtPageInfoFromHtml(html) {
  const data = extractNuxtData(html);
  if (!data.length) return {};
  const resolve = makeNuxtResolver(data);
  for (let i = 0; i < data.length; i++) {
    const raw = data[i];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    if (!('data' in raw) || !('total' in raw) || !('current_page' in raw) || !('page_size' in raw) || !('last_page' in raw)) continue;
    const info = resolve(raw, 0);
    if (Array.isArray(info.data)) return info;
  }
  return {};
}

export function encodeVodId(row) {
  return `a91:${encodeURIComponent(JSON.stringify(compactVod(row)))}`;
}

export function decodeVodId(id) {
  const text = Array.isArray(id) ? id[0] : id;
  const value = safeText(text);
  if (value.startsWith('a91:')) {
    try {
      const vod = JSON.parse(decodeURIComponent(value.slice(4)));
      if (vod && vod.id) CACHE_BY_ID[vod.id] = vod;
      return vod || {};
    } catch (e) {
      return {};
    }
  }
  return CACHE_BY_ID[value] || { id: value };
}

export function formatVodItem(row) {
  const vod = compactVod(row);
  if (vod.id) CACHE_BY_ID[vod.id] = vod;
  return {
    vod_id: encodeVodId(vod),
    vod_name: vod.name,
    vod_pic: vod.img,
    vod_remarks: vod.duration || vod.show_at || vod.click,
  };
}

function tagText(row) {
  return Array.isArray(row.tags) ? row.tags.map((tag) => safeText(tag && tag.name)).filter(Boolean).join(',') : '';
}

export function formatVodDetail(row, originalId) {
  const vod = compactVod(row);
  const playUrl = vod.play_links.map((link, index) => `${link.name || `线路${index + 1}`}$${normalizeUrl(link.m3u8_url)}`).join('#');
  const tags = tagText(vod);
  const content = [
    vod.description && vod.description !== '当前暂无简介' ? vod.description : '',
    tags ? `标签：${tags}` : '',
    vod.click ? `播放：${vod.click}` : '',
    vod.show_at ? `时间：${vod.show_at}` : '',
    `来源：${SOURCE}`,
  ]
    .filter(Boolean)
    .join('\n');
  return {
    vod_id: originalId || encodeVodId(vod),
    vod_name: vod.name || vod.id,
    type_name: tags,
    vod_pic: vod.img,
    vod_remarks: vod.duration || vod.show_at || vod.click,
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

function listFromUrl(url) {
  const html = requestHtml(url, `${BASE}/`);
  return {
    rows: parseNuxtMoviesFromHtml(html),
    pageInfo: parseNuxtPageInfoFromHtml(html),
  };
}

function mapList(rows, page, pageInfo, pageable) {
  const list = rows.map(formatVodItem).filter((item) => item.vod_id && item.vod_name && item.vod_pic);
  const total = Number(pageInfo && pageInfo.total) || list.length;
  const limit = Number(pageInfo && pageInfo.page_size) || (list.length || 10);
  let pagecount = Number(pageInfo && pageInfo.last_page) || 0;
  if (!pageable) pagecount = page;
  if (!pagecount) pagecount = list.length ? page + 1 : page;
  return toJson({
    page,
    pagecount,
    limit,
    total,
    list,
  });
}

const spider = {
  init() {},
  home(filter) {
    return toJson({ class: CATEGORIES.map((item) => ({ type_id: item.type_id, type_name: item.type_name })) });
  },
  homeVod() {
    const { rows } = listFromUrl(buildCategoryUrl('recommend', 1));
    return toJson({ list: rows.map(formatVodItem) });
  },
  category(tid, pg, filter, extend) {
    const page = safePage(pg);
    const id = safeText(tid) || 'recommend';
    if (id !== 'recommend' && page > 1) {
      return toJson({ page, pagecount: page, limit: 26, total: 0, list: [] });
    }
    const { rows, pageInfo } = listFromUrl(buildCategoryUrl(id, page));
    return mapList(rows, page, pageInfo, id === 'recommend');
  },
  detail(id) {
    const originalId = Array.isArray(id) ? id[0] : id;
    const vod = decodeVodId(originalId);
    if (!vod || !hasPlayableLinks(vod)) return toJson({ list: [] });
    return toJson({ list: [formatVodDetail(vod, originalId)] });
  },
  play(flag, id) {
    return toJson({
      parse: 0,
      flag,
      url: normalizeUrl(id),
      header: {
        'User-Agent': UA,
        Referer: `${BASE}/`,
      },
    });
  },
  search(key, quick, pg) {
    const page = safePage(pg);
    const { rows, pageInfo } = listFromUrl(buildSearchUrl(key, page));
    return mapList(rows, page, pageInfo, true);
  },
  destroy() {},
};

export function __jsEvalReturn() {
  return spider;
}

export default spider;
