import assert from 'node:assert/strict';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const configPath = path.join(root, 'app/src/main/assets/libretv_config.json');
const spiderPath = path.join(root, 'app/src/main/assets/js/xfca.js');
const API_BASE = 'https://app8.riyxjp.com';

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const site = config.sites.find((item) => item.key === 'xfca');

assert.ok(site, 'Missing xfca site in libretv_config.json');
assert.equal(site.name, '2048快播');
assert.equal(site.type, 3);
assert.equal(site.api, 'assets://js/xfca.js');
assert.equal(site.searchable, 0);
assert.equal(site.quickSearch, 0);
assert.equal(site.changeable, 1);
assert.ok(fs.existsSync(spiderPath), 'Missing app/src/main/assets/js/xfca.js');

function request(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const headers = { ...(options.headers || {}) };
    const body = options.body || null;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectCount < 5) {
          const next = new URL(res.headers.location, target).href;
          res.resume();
          request(next, options, redirectCount + 1).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            code: res.statusCode,
            headers: res.headers,
            content: buffer.toString('utf8'),
            buffer,
            url: target.href,
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(options.timeout || 30000, () => req.destroy(new Error(`timeout: ${url}`)));
    if (body) req.write(body);
    req.end();
  });
}

const spider = await import(pathToFileURL(spiderPath).href);

for (const name of ['init', 'home', 'homeVod', 'category', 'detail', 'play', 'search', 'destroy']) {
  assert.equal(typeof spider.default?.[name], 'function', `Missing default.${name}`);
}

for (const name of [
  'API_BASES',
  'SOURCE',
  'CATEGORIES',
  'buildListUrl',
  'buildInfoUrl',
  'parseListResponse',
  'parseDetailResponse',
  'formatVodItem',
  'formatVodDetail',
  'encodeVodId',
  'decodeVodId',
  'normalizeUrl',
]) {
  assert.notEqual(spider[name], undefined, `Missing export ${name}`);
}

assert.equal(spider.SOURCE, '2048快播');
assert.ok(spider.API_BASES.includes(API_BASE));
const expectedCategoryNames = new Map([
  ['selfie', '网友自拍'],
  ['cg_daily', '每日吃瓜'],
  ['xhs', '小黄书'],
  ['xp', 'XP天堂'],
  ['haijiao', '海角网'],
  ['av_platform', 'AV大平台'],
  ['dyn_new3', '森林资源'],
  ['dyn_porn91', '91Porn'],
  ['dyn_jkun', 'Jkun资源'],
]);
assert.ok(spider.CATEGORIES.length >= 67, 'should expose the stable XFCA clist category list plus playable dynamic /list categories');
for (const [typeId, typeName] of expectedCategoryNames) {
  assert.equal(spider.CATEGORIES.find((item) => item.type_id === typeId)?.type_name, typeName, `missing category ${typeId}`);
}
for (const [typeId, typeName] of [
  ['hxc', '含羞草'],
  ['porntv', 'porntv'],
  ['haosetv', '好色TV'],
  ['myplay', 'Myplay'],
  ['av_daquan', 'AV大全'],
]) {
  assert.equal(spider.CATEGORIES.find((item) => item.type_id === typeId)?.type_name, typeName, `historical category should remain visible: ${typeId}`);
}

const home = JSON.parse(spider.default.home(false));
assert.equal(home.class.length, spider.CATEGORIES.length);
assert.ok(home.class.some((item) => item.type_id === 'xhs' && item.type_name === '小黄书'));
assert.ok(home.class.some((item) => item.type_id === 'dyn_new3' && item.type_name === '森林资源'));
assert.ok(home.class.some((item) => item.type_id === 'hxc' && item.type_name === '含羞草'));

assert.equal(spider.buildListUrl('cg_daily', 1, API_BASE), `${API_BASE}/forav/list2?p=1`);
assert.equal(spider.buildListUrl('selfie', 2, API_BASE), `${API_BASE}/forav/list5?t=list&p=2`);
assert.equal(spider.buildListUrl('wh_vip', 1, API_BASE), `${API_BASE}/forav/list75?p=1`);
assert.equal(spider.buildInfoUrl('wh_vip', '34591', API_BASE), `${API_BASE}/forav/info75?id=34591`);
assert.equal(spider.buildListUrl('xhs', 1, API_BASE), `${API_BASE}/forav/list41?p=1`);
assert.equal(spider.buildInfoUrl('xhs', '10040', API_BASE), `${API_BASE}/forav/info41?id=10040`);
assert.equal(spider.buildListUrl('av_platform', 1, API_BASE), `${API_BASE}/forav/list77?t=dm265%24cn%24chinese-subtitle&p=1`);
assert.equal(spider.buildListUrl('dyn_new3', 1, API_BASE), `${API_BASE}/forav/list?u=list%2Fnew3%2Findex.html`);
assert.equal(spider.buildListUrl('dyn_new3', 2, API_BASE), `${API_BASE}/forav/list?u=list%2Fnew3%2Findex%2F2.html`);
assert.equal(spider.buildInfoUrl('dyn_new3', 'new3/276363', API_BASE), `${API_BASE}/forav/info?id=new3%2F276363`);

const dynamicUrlDetail = spider.parseDetailResponse(
  JSON.stringify({
    title: '动态详情',
    text: '森林资源',
    url: '<html><body><script>var src="https://2606.senlin2026.com/20260701/fi6UAwzb/index.m3u8";</script></body></html>',
  }),
  { id: 'new3/276363', type_id: 'dyn_new3', name: '动态详情' }
);
assert.equal(dynamicUrlDetail.id, 'new3/276363');
assert.equal(dynamicUrlDetail.playLinks.length, 1, 'dynamic data.url detail should expose a play link');
assert.equal(dynamicUrlDetail.playLinks[0].url, 'https://2606.senlin2026.com/20260701/fi6UAwzb/index.m3u8');

const dynamicPlayerArrayDetail = spider.parseDetailResponse(
  JSON.stringify({
    title: '动态详情',
    url: '<script>var playurls = [{"name":"AUTO","url":"/Player/supfast/api.php?token=abc&redirect=1"}];</script>',
  }),
  { id: 'AvDB/JIMMY-002', type_id: 'dyn_avdb', name: '动态详情' }
);
assert.equal(dynamicPlayerArrayDetail.playLinks.length, 1, 'dynamic playurls array should expose a play link');
assert.equal(dynamicPlayerArrayDetail.playLinks[0].url, `${API_BASE}/Player/supfast/api.php?token=abc&redirect=1`);

const dynamicRawSourceListDetail = spider.parseDetailResponse(
  JSON.stringify({
    title: '动态详情',
    url: '<script>const rawSourceList = [{"label":"1080P","url":"https://18av.mm-cg.com/js/player/play.php?numresolution=1080&id=abc","type":"text/html"}];</script>',
  }),
  { id: 'AV18/321480_JUFE-614', type_id: 'dyn_av18', name: '动态详情' }
);
assert.equal(dynamicRawSourceListDetail.playLinks.length, 1, 'dynamic rawSourceList array should expose a play link');
assert.equal(dynamicRawSourceListDetail.playLinks[0].name, '1080P');
assert.equal(dynamicRawSourceListDetail.playLinks[0].url, 'https://18av.mm-cg.com/js/player/play.php?numresolution=1080&id=abc');

const headers = {
  'User-Agent': spider.UA,
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  Origin: spider.SITE_ORIGIN,
  Referer: `${spider.SITE_ORIGIN}/kb/#/`,
};

const cache = new Map();
for (const url of [
  spider.buildListUrl('cg_daily', 1, API_BASE),
  spider.buildListUrl('selfie', 1, API_BASE),
  spider.buildListUrl('wh_vip', 1, API_BASE),
  spider.buildListUrl('dyn_new3', 1, API_BASE),
  spider.buildListUrl('dyn_new3', 2, API_BASE),
]) {
  const res = await request(url, { headers, timeout: 30000 });
  assert.equal(res.code, 200, `list should fetch ${url}`);
  assert.match(res.content, /"listav"\s*:/, `list should include listav ${url}`);
  cache.set(spider.normalizeUrl(url), res.content);
}

const vipRows = spider.parseListResponse(cache.get(spider.buildListUrl('wh_vip', 1, API_BASE)), 'wh_vip');
assert.ok(vipRows.length >= 10, 'list75 should be API-readable');
assert.ok(vipRows[0].id, 'row should include id');
assert.ok(vipRows[0].name, 'row should include name');
assert.match(vipRows[0].pic, /^https?:\/\//, 'row should include image');

const dynamicRows = spider.parseListResponse(cache.get(spider.buildListUrl('dyn_new3', 1, API_BASE)), 'dyn_new3');
assert.ok(dynamicRows.length >= 10, 'dynamic list/new3 should be API-readable');
assert.equal(dynamicRows[0].type_id, 'dyn_new3');
assert.match(dynamicRows[0].id, /^new3\//, 'dynamic row should keep source-prefixed id');
assert.ok(dynamicRows[0].name, 'dynamic row should include name');
assert.match(dynamicRows[0].pic, /^https?:\/\//, 'dynamic row should include image');

const dynamicPage2 = JSON.parse(cache.get(spider.buildListUrl('dyn_new3', 2, API_BASE)));
assert.match(dynamicPage2.pagetext, /^Pages 2 \//, 'dynamic second page should use /index/2.html path');

const item = spider.formatVodItem(vipRows[0]);
assert.match(item.vod_id, /^xfca:/);
assert.equal(item.vod_name, vipRows[0].name);

const infoUrl = spider.buildInfoUrl('wh_vip', vipRows[0].id, API_BASE);
const infoRes = await request(infoUrl, { headers, timeout: 30000 });
assert.equal(infoRes.code, 200, 'detail should fetch');
assert.match(infoRes.content, /"content"\s*:/, 'detail should include content');
assert.match(infoRes.content, /data-config|\.m3u8|\.mp4/i, 'detail should expose playable data');
cache.set(spider.normalizeUrl(infoUrl), infoRes.content);

const parsedDetail = spider.parseDetailResponse(infoRes.content, vipRows[0]);
assert.equal(parsedDetail.id, vipRows[0].id);
assert.ok(parsedDetail.playLinks.length >= 1, 'detail should include play links');
assert.match(parsedDetail.playLinks[0].url, /^https?:\/\/.+\.(m3u8|mp4)(?:[?#].*)?$/i);

const dynamicItem = spider.formatVodItem(dynamicRows[0]);
const dynamicInfoUrl = spider.buildInfoUrl('dyn_new3', dynamicRows[0].id, API_BASE);
const dynamicInfoRes = await request(dynamicInfoUrl, { headers, timeout: 30000 });
assert.equal(dynamicInfoRes.code, 200, 'dynamic detail should fetch');
assert.match(dynamicInfoRes.content, /"url"\s*:/, 'dynamic detail should include url html');
assert.match(dynamicInfoRes.content, /\.m3u8|\.mp4/i, 'dynamic detail should expose playable data');
cache.set(spider.normalizeUrl(dynamicInfoUrl), dynamicInfoRes.content);

const parsedDynamicDetail = spider.parseDetailResponse(dynamicInfoRes.content, dynamicRows[0]);
assert.equal(parsedDynamicDetail.id, dynamicRows[0].id);
assert.ok(parsedDynamicDetail.playLinks.length >= 1, 'dynamic detail should include play links');
assert.match(parsedDynamicDetail.playLinks[0].url, /^https?:\/\/.+\.(m3u8|mp4)(?:[?#].*)?$/i);

globalThis.req = (url, options = {}) => {
  const normalized = spider.normalizeUrl(url);
  const content = cache.get(normalized);
  if (!content) throw new Error(`Unexpected req URL ${normalized} ${JSON.stringify(options)}`);
  return { code: 200, content, headers: {} };
};

const categoryPage = JSON.parse(spider.default.category('wh_vip', 1));
assert.equal(categoryPage.page, 1);
assert.ok(categoryPage.pagecount > 1);
assert.ok(categoryPage.list.length >= 10);

const detail = JSON.parse(spider.default.detail(item.vod_id));
assert.equal(detail.list.length, 1);
assert.equal(detail.list[0].vod_id, item.vod_id);
assert.equal(detail.list[0].vod_play_from, '2048快播');
assert.match(detail.list[0].vod_play_url, /线路1\$https?:\/\/.+\.(m3u8|mp4)/i);

const dynamicCategoryPage = JSON.parse(spider.default.category('dyn_new3', 1));
assert.equal(dynamicCategoryPage.page, 1);
assert.ok(dynamicCategoryPage.pagecount > 1);
assert.ok(dynamicCategoryPage.list.length >= 10);

const dynamicDetail = JSON.parse(spider.default.detail(dynamicItem.vod_id));
assert.equal(dynamicDetail.list.length, 1);
assert.equal(dynamicDetail.list[0].vod_id, dynamicItem.vod_id);
assert.equal(dynamicDetail.list[0].vod_play_from, '2048快播');
assert.match(dynamicDetail.list[0].vod_play_url, /线路1\$https?:\/\/.+\.(m3u8|mp4)/i);

const playUrl = detail.list[0].vod_play_url.split('$')[1].split('#')[0];
const play = JSON.parse(spider.default.play('2048快播', playUrl));
assert.equal(play.parse, 0);
assert.equal(play.url, playUrl);
assert.equal(play.header.Referer, `${spider.SITE_ORIGIN}/kb/#/`);

if (/\.m3u8(?:[?#]|$)/i.test(play.url)) {
  const m3u8 = await request(play.url, {
    headers: {
      ...play.header,
      Accept: '*/*',
    },
    timeout: 30000,
  });
  assert.equal(m3u8.code, 200);
  assert.match(m3u8.content, /^#EXTM3U/);
}

console.log('XFCA source verification passed');
