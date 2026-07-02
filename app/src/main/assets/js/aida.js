import * as CryptoJSImport from './lib/crypto-js.js';

export const BASE = 'https://ww22.aida1.cyou';
export const SOURCE = '爱豆';
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
export const DEFAULT_PAGE_SIZE = 12;
export const CATEGORIES = [
  { type_id: 'label_new', type_name: '最新更新' },
  { type_id: 'label_hot', type_name: '热门事件' },
  { type_id: 'label_good', type_name: '视频精选' },
  { type_id: '1', type_name: '国产' },
  { type_id: '5', type_name: '传媒' },
  { type_id: '2', type_name: '日韩' },
  { type_id: '3', type_name: '欧美' },
  { type_id: '4', type_name: '动漫' },
  { type_id: '6', type_name: '免费' },
];
const COVER_CACHE = {};
const SPECIAL_CATEGORIES = {
  label_new: { type: '', by: 'vod_time', tag: '' },
  label_hot: { type: '', by: 'vod_hits', tag: '门|料|流出|伦理' },
  label_good: { type: '', by: 'vod_up', tag: '' },
};

function crypto() {
  return globalThis.CryptoJS || CryptoJSImport.default || CryptoJSImport;
}

function toJson(value) {
  return JSON.stringify(value);
}

function safeText(value) {
  return value == null ? '' : String(value).trim();
}

function reverse(value) {
  return String(value).split('').reverse().join('');
}

function apiKey(t) {
  return reverse(String(Number(t) * 299) + '1');
}

function apiMd5(t) {
  return parseInt(reverse(String(parseInt(Number(t) * 177, 10)) + '1'), 10).toString(16);
}

function aesEncrypt(text, t) {
  const keyText = apiKey(t);
  const key = crypto().enc.Latin1.parse(keyText);
  const iv = crypto().enc.Latin1.parse(keyText);
  return crypto().AES.encrypt(text, key, { iv, mode: crypto().mode.CBC }).toString();
}

function aesDecrypt(text, t) {
  const keyText = apiKey(t);
  const key = crypto().enc.Latin1.parse(keyText);
  const iv = crypto().enc.Latin1.parse(keyText);
  const decrypted = crypto().AES.decrypt(text, key, { iv, mode: crypto().mode.CBC });
  return decrypted.toString(crypto().enc.Utf8);
}

export function buildApiRequest(path, payload, fixedTime) {
  const t = fixedTime || Date.now();
  const data = aesEncrypt(JSON.stringify(payload || {}), t);
  return {
    t,
    url: `${BASE}/awsapi${path}?md5=${apiMd5(t)}`,
    body: `data=${encodeURIComponent(data)}`,
    headers: {
      'User-Agent': UA,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: BASE,
      Referer: `${BASE}/`,
    },
  };
}

export function decodeApiResponse(content, t) {
  const outer = JSON.parse(content || '{}');
  if (outer.code !== 200 || !outer.data) return outer;
  return JSON.parse(aesDecrypt(outer.data, t));
}

function responseContent(res) {
  if (!res) return '';
  if (typeof res === 'string') return res;
  if (typeof res.content === 'string') return res.content;
  return '';
}

function bytesToWordArray(bytes) {
  const words = [];
  for (let i = 0; i < bytes.length; i++) words[i >>> 2] = (words[i >>> 2] || 0) | (bytes[i] << (24 - (i % 4) * 8));
  return crypto().lib.WordArray.create(words, bytes.length);
}

function wordArrayToBytes(wordArray) {
  const bytes = [];
  const words = wordArray.words;
  for (let i = 0; i < wordArray.sigBytes; i++) bytes.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
  return bytes;
}

export function decodeCoverBase64(base64) {
  const bytes = wordArrayToBytes(crypto().enc.Base64.parse(safeText(base64))).reverse();
  return `data:image/jpeg;base64,${crypto().enc.Base64.stringify(bytesToWordArray(bytes))}`;
}

export function resolveVodPic(row) {
  const pic = safeText(typeof row === 'string' ? row : row && (row.vodPic || row.vod_pic || row.pic));
  if (!pic || pic.startsWith('data:')) return pic;
  if (row && Number(row.test || row.vodTest || row.vod_test) === 1) return pic;
  if (COVER_CACHE[pic]) return COVER_CACHE[pic];
  const http = typeof req === 'function' ? req : globalThis.req;
  if (typeof http !== 'function') return pic;
  try {
    const res = http(pic, {
      timeout: 15000,
      buffer: 2,
      headers: {
        'User-Agent': UA,
        Referer: `${BASE}/`,
      },
    });
    if (res && res.code && Number(res.code) !== 200) return pic;
    const content = responseContent(res);
    if (!content) return pic;
    const dataUri = decodeCoverBase64(content);
    COVER_CACHE[pic] = dataUri;
    return dataUri;
  } catch (e) {
    return pic;
  }
}

function apiPost(path, payload) {
  const http = typeof req === 'function' ? req : globalThis.req;
  if (typeof http !== 'function') return { code: 500, message: 'req unavailable' };
  const request = buildApiRequest(path, payload);
  try {
    const res = http(request.url, {
      method: 'post',
      timeout: 20000,
      headers: request.headers,
      body: request.body,
    });
    const content = responseContent(res);
    const outer = JSON.parse(content || '{}');
    return {
      code: outer.code,
      message: outer.message,
      data: outer.data ? decodeApiResponse(content, request.t) : outer.data,
    };
  } catch (e) {
    return { code: 500, message: e && e.message ? e.message : String(e) };
  }
}

function safePage(page) {
  const num = parseInt(page || '1', 10);
  return Number.isFinite(num) && num > 0 ? num : 1;
}

function pageSize(quick) {
  return DEFAULT_PAGE_SIZE;
}

function baseListPayload(page, size) {
  return {
    type: '',
    by: 'vod_time',
    order: 'desc',
    page,
    size,
    count: size,
    tag: '',
    keyword: '',
    extypes: '6',
  };
}

export function buildCategoryPayload(tid, pg) {
  const page = safePage(pg);
  const size = pageSize(false);
  const id = safeText(tid);
  const payload = baseListPayload(page, size);
  const special = SPECIAL_CATEGORIES[id];
  if (special) {
    payload.type = special.type;
    payload.by = special.by;
    payload.tag = special.tag;
    payload.extypes = '6';
    return payload;
  }
  payload.type = id;
  payload.by = 'vod_time';
  payload.extypes = id === '6' ? '' : '6';
  return payload;
}

export function buildSearchPayload(key, pg, quick) {
  const page = safePage(pg);
  const size = pageSize(quick);
  const payload = baseListPayload(page, size);
  payload.keyword = safeText(key);
  return payload;
}

function formatDate(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && !/^\d+$/.test(value)) return value;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return safeText(value);
  const ms = num > 1000000000000 ? num : num * 1000;
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatVodItem(row) {
  return {
    vod_id: safeText(row && (row.vodId || row.vod_id || row.id)),
    vod_name: safeText(row && (row.vodName || row.vod_name || row.name)),
    vod_pic: resolveVodPic(row),
    vod_remarks: formatDate(row && (row.vodTime || row.vod_time || row.time)) || (row && row.vodHits ? `${row.vodHits}次` : ''),
  };
}

export function buildM3u8Url(code, line) {
  return `${BASE}/api/m3u8/${safeText(code)}.m3u8?line=${line || 1}`;
}

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data)) return data;
  return [];
}

export function mapSearchResult(result, mode, page) {
  if (!result || result.code !== 200) {
    return toJson(mode === 'detail' ? { list: [] } : { page: safePage(page), pagecount: safePage(page), limit: 24, total: 0, list: [] });
  }
  if (mode === 'detail') {
    const vod = result.data || {};
    const code = safeText(vod.code);
    const title = safeText(vod.vodName || vod.vod_name || vod.name || vod.vodId);
    return toJson({
      list: [
        {
          vod_id: safeText(vod.vodId || vod.vod_id || vod.id),
          vod_name: title,
          type_name: safeText(vod.typeName || vod.type_name),
          vod_pic: resolveVodPic(vod),
          vod_remarks: formatDate(vod.vodTime || vod.vod_time),
          vod_content: `${title}\n来源：${SOURCE}`,
          vod_play_from: SOURCE,
          vod_play_url: `线路1$${buildM3u8Url(code, 1)}#线路2$${buildM3u8Url(code, 2)}`,
        },
      ],
    });
  }
  const pg = safePage(page || (result.data && result.data.page));
  const rows = rowsFrom(result.data);
  const total = Number(result.data && (result.data.total || result.data.count)) || rows.length;
  const size = Number(result.data && result.data.size) || DEFAULT_PAGE_SIZE;
  const pagecount = total > size ? Math.ceil(total / size) : rows.length ? pg + 1 : pg;
  return toJson({
    page: pg,
    pagecount,
    limit: size,
    total,
    list: rows.map(formatVodItem).filter((item) => item.vod_id && item.vod_name),
  });
}

function init() {}

function home() {
  return toJson({ class: CATEGORIES.map((item) => ({ type_id: item.type_id, type_name: item.type_name })) });
}

function homeVod() {
  const result = apiPost('/vod/search.php', buildCategoryPayload('label_new', 1));
  const mapped = JSON.parse(mapSearchResult(result, 'list', 1));
  return toJson({ list: mapped.list || [] });
}

function category(tid, pg) {
  const page = safePage(pg);
  const result = apiPost('/vod/search.php', buildCategoryPayload(tid, page));
  return mapSearchResult(result, 'list', page);
}

function detail(id) {
  const vodId = Array.isArray(id) ? id[0] : id;
  const result = apiPost('/vod/info.php', { id: safeText(vodId) });
  return mapSearchResult(result, 'detail');
}

function play(flag, id) {
  return toJson({
    parse: 0,
    flag,
    url: safeText(id),
    header: {
      'User-Agent': UA,
      Referer: `${BASE}/`,
    },
  });
}

function search(key, quick, pg) {
  const page = safePage(pg);
  const result = apiPost('/vod/search.php', buildSearchPayload(key, page, quick));
  return mapSearchResult(result, 'list', page);
}

function destroy() {}

export function __jsEvalReturn() {
  return { init, home, homeVod, category, detail, play, search, destroy };
}

export default { init, home, homeVod, category, detail, play, search, destroy };
