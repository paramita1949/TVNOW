export const API_BASES = ['https://app8.riyxjp.com', 'https://api3.riyxjp.com'];
export const SITE_ORIGIN = 'https://bbs.xfca2022.com';
export const SOURCE = '2048快播';
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

export const CATEGORIES = [
  { type_id: 'cg_daily', type_name: '每日吃瓜', list: 'list2', info: 'info2', param: 'p' },
  { type_id: 'selfie', type_name: '网友自拍', list: 'list5', info: 'info5', param: 't', value: 'list' },
  { type_id: 'wh_1', type_name: '网红爆料1', list: 'list61', info: 'info61', param: 'p' },
  { type_id: 'wh_2', type_name: '网红爆料2', list: 'list62', info: 'info62', param: 'p' },
  { type_id: 'wh_vip', type_name: '网红精品', list: 'list75', info: 'info75', param: 'p' },
];

const CACHE_BY_ID = {};
let ACTIVE_BASE = API_BASES[0];

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

export function normalizeUrl(url) {
  const value = htmlDecode(url);
  if (!value) return '';
  try {
    return new URL(value).href;
  } catch (e) {
    return value;
  }
}

function categoryById(tid) {
  const id = safeText(tid) || CATEGORIES[0].type_id;
  return CATEGORIES.find((item) => item.type_id === id) || CATEGORIES[0];
}

function apiRoot(base) {
  return (base || ACTIVE_BASE || API_BASES[0]).replace(/\/+$/, '');
}

export function buildListUrl(tid, pg, base) {
  const category = categoryById(tid);
  const page = safePage(pg);
  const root = apiRoot(base);
  if (category.param === 't') {
    return `${root}/forav/${category.list}?t=${encodeURIComponent(category.value || '')}&p=${page}`;
  }
  return `${root}/forav/${category.list}?p=${page}`;
}

export function buildInfoUrl(tid, id, base) {
  const category = categoryById(tid);
  return `${apiRoot(base)}/forav/${category.info}?id=${encodeURIComponent(safeText(id))}`;
}

function commonHeaders(referer) {
  return {
    'User-Agent': UA,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    Origin: SITE_ORIGIN,
    Referer: referer || `${SITE_ORIGIN}/kb/#/`,
  };
}

function apiGetByPath(path, referer) {
  const http = typeof req === 'function' ? req : globalThis.req;
  if (typeof http !== 'function') return '';
  const bases = [ACTIVE_BASE].concat(API_BASES.filter((base) => base !== ACTIVE_BASE));
  for (const base of bases) {
    try {
      const url = `${apiRoot(base)}${path}`;
      const res = http(url, {
        timeout: 20000,
        headers: commonHeaders(referer),
      });
      const content = responseContent(res);
      if (content) {
        ACTIVE_BASE = apiRoot(base);
        return content;
      }
    } catch (e) {
      // Try next base.
    }
  }
  return '';
}

function pathFromUrl(url) {
  const target = new URL(url);
  return target.pathname + target.search;
}

function compactRow(row, tid) {
  const category = categoryById(tid || row && row.type_id);
  const vod = {
    type_id: category.type_id,
    id: safeText(row && (row.id || row.aId || row.vod_id)),
    name: safeText(row && (row.name || row.aTitle || row.title || row.vod_name)),
    text: safeText(row && (row.text || row.aText || row.vod_remarks)),
    pic: normalizeUrl(row && (row.pic || row.aImage || row.vod_pic)),
    playLinks: Array.isArray(row && row.playLinks) ? row.playLinks : [],
    content: safeText(row && (row.content || row.vod_content)),
  };
  if (vod.id) CACHE_BY_ID[`${vod.type_id}:${vod.id}`] = vod;
  return vod;
}

export function encodeVodId(row) {
  return `xfca:${encodeURIComponent(JSON.stringify(compactRow(row)))}`;
}

export function decodeVodId(id) {
  const text = Array.isArray(id) ? id[0] : id;
  const value = safeText(text);
  if (value.startsWith('xfca:')) {
    try {
      const vod = JSON.parse(decodeURIComponent(value.slice(5)));
      if (vod && vod.id) CACHE_BY_ID[`${vod.type_id}:${vod.id}`] = vod;
      return vod || {};
    } catch (e) {
      return {};
    }
  }
  return CACHE_BY_ID[value] || { id: value, type_id: CATEGORIES[0].type_id };
}

function parseJson(content) {
  try {
    const parsed = JSON.parse(content || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

export function parseListResponse(content, tid) {
  const data = parseJson(content);
  const rows = Array.isArray(data.listav) ? data.listav : [];
  return rows.map((row) => compactRow(row, tid)).filter((row) => row.id && row.name);
}

function parseDPlayerUrls(html) {
  const urls = [];
  const seen = {};
  for (const match of String(html || '').matchAll(/data-config=(["'])([\s\S]*?)\1/gi)) {
    try {
      const config = JSON.parse(htmlDecode(match[2]));
      const url = safeText(config && config.video && config.video.url);
      if (url && !seen[url]) {
        urls.push({ name: `线路${urls.length + 1}`, url: normalizeUrl(url) });
        seen[url] = true;
      }
    } catch (e) {
      // Ignore malformed ad/player config.
    }
  }
  for (const match of String(html || '').matchAll(/https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi)) {
    const url = normalizeUrl(match[0]);
    if (url && !seen[url]) {
      urls.push({ name: `线路${urls.length + 1}`, url });
      seen[url] = true;
    }
  }
  const direct = safeText(html);
  if (/^https?:\/\/.+\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(direct) && !seen[direct]) {
    urls.push({ name: `线路${urls.length + 1}`, url: normalizeUrl(direct) });
  }
  return urls;
}

export function parseDetailResponse(content, fallback = {}) {
  const data = parseJson(content);
  const base = compactRow(fallback || {});
  const rawContent = safeText(data.content);
  const playLinks = parseDPlayerUrls(rawContent);
  return compactRow(
    {
      ...base,
      title: safeText(data.title) || base.name,
      text: safeText(data.text) || base.text,
      content: stripHtml(rawContent).replace(/https?:\/\/\S+\.(?:m3u8|mp4)(?:\?\S*)?/gi, '').trim(),
      playLinks,
      pic: base.pic,
    },
    base.type_id
  );
}

export function formatVodItem(row) {
  const vod = compactRow(row);
  return {
    vod_id: encodeVodId(vod),
    vod_name: vod.name,
    vod_pic: vod.pic,
    vod_remarks: vod.text,
  };
}

export function formatVodDetail(row, originalId) {
  const vod = compactRow(row);
  const playUrl = (vod.playLinks || []).map((link, index) => `${link.name || `线路${index + 1}`}$${normalizeUrl(link.url)}`).join('#');
  const content = [
    vod.content && vod.content !== vod.name ? vod.content : '',
    vod.text,
    `来源：${SOURCE}`,
    '说明：本源直连聚合接口获取播放地址；若后端返回空或链接过期，请刷新详情重取。',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    vod_id: originalId || encodeVodId(vod),
    vod_name: vod.name || vod.id,
    vod_pic: vod.pic,
    vod_remarks: vod.text,
    vod_content: content,
    vod_play_from: SOURCE,
    vod_play_url: playUrl,
  };
}

function mapList(content, tid, page) {
  const data = parseJson(content);
  const rows = parseListResponse(content, tid);
  const pagecount = Number(data.pagetotal) || (rows.length ? page + 1 : page);
  const limit = rows.length || 20;
  return toJson({
    page,
    pagecount,
    limit,
    total: pagecount * limit,
    list: rows.map(formatVodItem),
  });
}

const spider = {
  init() {},
  home(filter) {
    return toJson({ class: CATEGORIES.map((item) => ({ type_id: item.type_id, type_name: item.type_name })) });
  },
  homeVod() {
    const url = buildListUrl(CATEGORIES[0].type_id, 1);
    const content = apiGetByPath(pathFromUrl(url));
    return toJson({ list: parseListResponse(content, CATEGORIES[0].type_id).map(formatVodItem) });
  },
  category(tid, pg, filter, extend) {
    const page = safePage(pg);
    const url = buildListUrl(tid, page);
    const content = apiGetByPath(pathFromUrl(url));
    return mapList(content, tid, page);
  },
  detail(id) {
    const originalId = Array.isArray(id) ? id[0] : id;
    const vod = decodeVodId(originalId);
    if (!vod || !vod.id) return toJson({ list: [] });
    const url = buildInfoUrl(vod.type_id, vod.id);
    const detail = parseDetailResponse(apiGetByPath(pathFromUrl(url)), vod);
    if (!detail.playLinks || !detail.playLinks.length) return toJson({ list: [] });
    return toJson({ list: [formatVodDetail(detail, originalId)] });
  },
  play(flag, id) {
    return toJson({
      parse: 0,
      flag,
      url: normalizeUrl(id),
      header: {
        'User-Agent': UA,
        Referer: `${SITE_ORIGIN}/kb/#/`,
      },
    });
  },
  search(key, quick, pg) {
    return toJson({ page: safePage(pg), pagecount: safePage(pg), limit: 20, total: 0, list: [] });
  },
  destroy() {},
};

export function __jsEvalReturn() {
  return spider;
}

export default spider;
