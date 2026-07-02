export const API_BASES = ['https://app8.riyxjp.com', 'https://api3.riyxjp.com'];
export const SITE_ORIGIN = 'https://bbs.xfca2022.com';
export const SOURCE = '2048快播';
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const CLIST_CATEGORIES = [
  { type_id: 'selfie', type_name: '网友自拍', list: 'list5', info: 'info5', param: 't', value: 'list' },
  { type_id: 'cg_daily', type_name: '每日吃瓜', list: 'list2', info: 'info2', param: 'p' },
  { type_id: 'wh_1', type_name: '网红爆料', list: 'list61', info: 'info61', param: 'p' },
  { type_id: 'hxc', type_name: '含羞草', list: 'list6', info: 'info6', param: 't', value: '4' },
  { type_id: 'mengluose', type_name: '萌萝涩精选', list: 'list82', info: 'info82', param: 't', value: '网红福利姬' },
  { type_id: 'aimeishe', type_name: '爱妹社', list: 'list80', info: 'info80', param: 'p' },
  { type_id: 'laojin', type_name: '老金影城', list: 'list78', info: 'info78', param: 't', value: 'sfjp' },
  { type_id: 'xhs', type_name: '小黄书', list: 'list41', info: 'info41', param: 'p' },
  { type_id: 'xx14', type_name: 'XX14', list: 'list68', info: 'info68', param: 't', value: 'chinese-subtitle' },
  { type_id: 'feicai', type_name: '废材视频', list: 'list43', info: 'info43', param: 't', value: 'vip' },
  { type_id: 'xp', type_name: 'XP天堂', list: 'list39', info: 'info39', param: 't', value: '70' },
  { type_id: 'haijiao', type_name: '海角网', list: 'list38', info: 'info38', param: 't', value: 'all' },
  { type_id: 'po85', type_name: '85PO', list: 'list48', info: 'info48', param: 't', value: 'all' },
  { type_id: 'seseporn', type_name: 'sesePorn', list: 'list70', info: 'info70', param: 't', value: '29ad024682fd789d560dd84b96b82f19' },
  { type_id: 'sae8', type_name: 'sae8视频', list: 'list37', info: 'info37', param: 't', value: '自拍黑料吃瓜' },
  { type_id: 'caoliu', type_name: '草榴社區', list: 'list65', info: 'info65', param: 't', value: '6' },
  { type_id: 'jiujiure', type_name: '久久热', list: 'list76', info: 'info76', param: 't', value: 'cb186ba8ba160b86eb97025b94353cac' },
  { type_id: 'jav91', type_name: '91Jav', list: 'list58', info: 'info58', param: 't', value: 'new' },
  { type_id: 'porntv', type_name: 'porntv', list: 'list56a', info: 'info56a', param: 't', value: 'play' },
  { type_id: 'avxingqiu', type_name: 'AV星球', list: 'list15', info: 'info15', param: 't', value: '46' },
  { type_id: 'avlove', type_name: 'AVLove', list: 'list53', info: 'info53', param: 't', value: '16' },
  { type_id: 'yeshe', type_name: '夜社', list: 'list51', info: 'info51', param: 't', value: '11' },
  { type_id: 'chinaporn', type_name: '中国P站', list: 'list50', info: 'info50', param: 't', value: 'vip' },
  { type_id: 'sexbee', type_name: 'sex bee', list: 'list18', info: 'info18', param: 't', value: 'new' },
  { type_id: 'haosetv', type_name: '好色TV', list: 'list44', info: 'info44', param: 't', value: 'latest' },
  { type_id: 'aiwei', type_name: '爱微社区', list: 'list54', info: 'info54', param: 't', value: '49f3b2bc1aec44b8a0fc03926ffe7499' },
  { type_id: 'iqqtv', type_name: 'iQQTV', list: 'list52', info: 'info52', param: 't', value: '37' },
  { type_id: 'hot91', type_name: '91热爆', list: 'list23', info: 'info23', param: 't', value: 'gouchang' },
  { type_id: 'video1024', type_name: '1024视频', list: 'list32', info: 'info32', param: 't', value: 'high' },
  { type_id: 'mise', type_name: '蜜色', list: 'list30', info: 'info30', param: 't', value: '32' },
  { type_id: 'dujia', type_name: '独家精选', list: 'list71', info: 'info71', param: 't', value: 'play' },
  { type_id: 'wanpi', type_name: '顽皮公馆', list: 'list66', info: 'info66', param: 't', value: '29' },
  { type_id: 'xingba_radio', type_name: '杏吧电台', list: 'list60', info: 'info60', param: 't', value: '302' },
  { type_id: 'bilibili', type_name: 'bili bili', list: 'list25', info: 'info25', param: 't', value: '1' },
  { type_id: 'asia', type_name: '亚洲视频', list: 'list16', info: 'info16', param: 't', value: '1' },
  { type_id: 'myplay', type_name: 'Myplay', list: 'list13', info: 'info13', param: 't', value: '0V9JxBAVmdQE' },
  { type_id: 'xiaoou', type_name: '小欧视频', list: 'list21', info: 'info21', param: 't', value: 'group13' },
  { type_id: 'rou_video', type_name: '肉視頻', list: 'list12', info: 'info12', param: 't', value: 'list' },
  { type_id: 'cg_2', type_name: '吃瓜2区', list: 'list3', info: 'info3', param: 'p' },
  { type_id: 'cg_3', type_name: '吃瓜3区', list: 'list4', info: 'info4', param: 'p' },
  { type_id: 'cg_4', type_name: '吃瓜4区', list: 'list7', info: 'info7', param: 'p' },
  { type_id: 'cg_5', type_name: '吃瓜5区', list: 'list20', info: 'info20', param: 'p' },
  { type_id: 'wh_2', type_name: '网红爆料2区', list: 'list62', info: 'info62', param: 'p' },
  { type_id: 'wh_3', type_name: '网红爆料3区', list: 'list63', info: 'info63', param: 'p' },
  { type_id: 'wh_vip', type_name: '网红爆料精品区', list: 'list75', info: 'info75', param: 'p' },
  { type_id: 'japan_av', type_name: '日本AV', list: 'list72', info: 'info72', param: 't', value: '1' },
  { type_id: 'av_daquan', type_name: 'AV大全', list: 'list56b', info: 'info56b', param: 't', value: '1' },
  { type_id: 'av_platform', type_name: 'AV大平台', list: 'list77', info: 'info77', param: 't', value: 'dm265$cn$chinese-subtitle' },
];

const DYNAMIC_CATEGORIES = [
  { type_id: 'dyn_porn91', type_name: '91Porn', mode: 'path', path: 'list/Porn91/index.html' },
  { type_id: 'dyn_avdb', type_name: 'AvDB', mode: 'path', path: 'list/AvDB/index.html' },
  { type_id: 'dyn_av18', type_name: 'AV18', mode: 'path', path: 'list/AV18/index.html' },
  { type_id: 'dyn_xvideos', type_name: 'Xvideos', mode: 'path', path: 'list/Xvideos/index.html' },
  { type_id: 'dyn_hsck', type_name: '黄色淘宝', mode: 'path', path: 'list/Hsck/index.html' },
  { type_id: 'dyn_xingba', type_name: '杏吧资源', mode: 'path', path: 'list/xingba/index.html' },
  { type_id: 'dyn_naizi', type_name: '大奶资源', mode: 'path', path: 'list/naizi/index.html' },
  { type_id: 'dyn_yutu', type_name: '玉兔资源', mode: 'path', path: 'list/yutu/index.html' },
  { type_id: 'dyn_bp', type_name: '白嫖资源', mode: 'path', path: 'list/bp/index.html' },
  { type_id: 'dyn_lj', type_name: '辣椒资源', mode: 'path', path: 'list/lj/index.html' },
  { type_id: 'dyn_new2', type_name: '奶香资源', mode: 'path', path: 'list/new2/index.html' },
  { type_id: 'dyn_new3', type_name: '森林资源', mode: 'path', path: 'list/new3/index.html' },
  { type_id: 'dyn_msv', type_name: '少女资源', mode: 'path', path: 'list/msv/index.html' },
  { type_id: 'dyn_ysj', type_name: '淫水资源', mode: 'path', path: 'list/ysj/index.html' },
  { type_id: 'dyn_xne', type_name: '香奶资源', mode: 'path', path: 'list/xne/index.html' },
  { type_id: 'dyn_hav', type_name: '黄片资源', mode: 'path', path: 'list/hav/index.html' },
  { type_id: 'dyn_lb', type_name: '乐播资源', mode: 'path', path: 'list/lb/index.html' },
  { type_id: 'dyn_fh', type_name: '番号资源', mode: 'path', path: 'list/fh/index.html' },
  { type_id: 'dyn_jkun', type_name: 'Jkun资源', mode: 'path', path: 'list/jkun/index.html' },
];

const UNPLAYABLE_CLIST_CATEGORY_IDS = new Set([
  'hxc',
  'jiujiure',
  'porntv',
  'haosetv',
  'aiwei',
  'iqqtv',
  'hot91',
  'mise',
  'dujia',
  'wanpi',
  'xingba_radio',
  'bilibili',
  'asia',
  'myplay',
  'xiaoou',
  'rou_video',
  'cg_3',
  'cg_4',
  'cg_5',
  'wh_3',
  'japan_av',
  'av_daquan',
]);

export const CATEGORIES = CLIST_CATEGORIES.filter((item) => !UNPLAYABLE_CLIST_CATEGORY_IDS.has(item.type_id)).concat(DYNAMIC_CATEGORIES);

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
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${apiRoot()}${value}`;
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

function dynamicPathForPage(path, page) {
  const value = safeText(path).replace(/^\/+/, '');
  if (!value || page <= 1) return value;
  if (/\.html(?:[?#].*)?$/i.test(value)) return value.replace(/\.html$/i, `/${page}.html`);
  return `${value.replace(/\/+$/, '')}/${page}.html`;
}

export function buildListUrl(tid, pg, base) {
  const category = categoryById(tid);
  const page = safePage(pg);
  const root = apiRoot(base);
  if (category.mode === 'path') {
    return `${root}/forav/list?u=${encodeURIComponent(dynamicPathForPage(category.path, category.singlePage ? 1 : page))}`;
  }
  if (category.param === 't') {
    return `${root}/forav/${category.list}?t=${encodeURIComponent(category.value || '')}&p=${page}`;
  }
  return `${root}/forav/${category.list}?p=${page}`;
}

export function buildInfoUrl(tid, id, base) {
  const category = categoryById(tid);
  if (category.mode === 'path') {
    return `${apiRoot(base)}/forav/info?id=${encodeURIComponent(safeText(id))}`;
  }
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
  function addUrl(name, url) {
    const normalized = normalizeUrl(url);
    if (normalized && !seen[normalized]) {
      urls.push({ name: safeText(name) || `线路${urls.length + 1}`, url: normalized });
      seen[normalized] = true;
    }
  }
  for (const match of String(html || '').matchAll(/data-config=(["'])([\s\S]*?)\1/gi)) {
    try {
      const config = JSON.parse(htmlDecode(match[2]));
      const url = safeText(config && config.video && config.video.url);
      addUrl(`线路${urls.length + 1}`, url);
    } catch (e) {
      // Ignore malformed ad/player config.
    }
  }
  for (const match of String(html || '').matchAll(/(?:playurls|rawSourceList)\s*=\s*(\[[\s\S]*?\])\s*;/gi)) {
    try {
      const playurls = JSON.parse(htmlDecode(match[1]));
      if (Array.isArray(playurls)) {
        for (const item of playurls) {
          addUrl(item && (item.name || item.label), item && item.url);
        }
      }
    } catch (e) {
      // Ignore malformed player list config.
    }
  }
  for (const match of String(html || '').matchAll(/https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi)) {
    addUrl(`线路${urls.length + 1}`, match[0]);
  }
  const direct = safeText(html);
  if (/^https?:\/\/.+\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(direct)) {
    addUrl(`线路${urls.length + 1}`, direct);
  }
  return urls;
}

export function parseDetailResponse(content, fallback = {}) {
  const data = parseJson(content);
  const base = compactRow(fallback || {});
  const rawContent = safeText(data.content || data.url || data.html);
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
  const pageTextMatch = safeText(data.pagetext).match(/Pages\s+\d+\s*\/\s*(\d+)/i);
  const category = categoryById(tid);
  const pagecount = category.singlePage ? page : Number(data.pagetotal) || Number(pageTextMatch && pageTextMatch[1]) || (rows.length ? page + 1 : page);
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
