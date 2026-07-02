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
assert.deepEqual(
  spider.CATEGORIES.map((item) => [item.type_id, item.type_name]),
  [
    ['cg_daily', '每日吃瓜'],
    ['selfie', '网友自拍'],
    ['wh_1', '网红爆料1'],
    ['wh_2', '网红爆料2'],
    ['wh_vip', '网红精品'],
  ]
);

const home = JSON.parse(spider.default.home(false));
assert.equal(home.class.length, 5);
assert.deepEqual(home.class[4], { type_id: 'wh_vip', type_name: '网红精品' });

assert.equal(spider.buildListUrl('cg_daily', 1, API_BASE), `${API_BASE}/forav/list2?p=1`);
assert.equal(spider.buildListUrl('selfie', 2, API_BASE), `${API_BASE}/forav/list5?t=list&p=2`);
assert.equal(spider.buildListUrl('wh_vip', 1, API_BASE), `${API_BASE}/forav/list75?p=1`);
assert.equal(spider.buildInfoUrl('wh_vip', '34591', API_BASE), `${API_BASE}/forav/info75?id=34591`);

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
