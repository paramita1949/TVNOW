import assert from 'node:assert/strict';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const configPath = path.join(root, 'app/src/main/assets/libretv_config.json');
const spiderPath = path.join(root, 'app/src/main/assets/js/a91.js');
const BASE = 'https://a91hlfst.a6cfwbq.com';

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const site = config.sites.find((item) => item.key === 'a91');

assert.ok(site, 'Missing a91 site in libretv_config.json');
assert.equal(site.name, '抖阴');
assert.equal(site.type, 3);
assert.equal(site.api, 'assets://js/a91.js');
assert.equal(site.searchable, 1);
assert.equal(site.quickSearch, 1);
assert.equal(site.changeable, 1);
assert.ok(fs.existsSync(spiderPath), 'Missing app/src/main/assets/js/a91.js');

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const headers = { ...(options.headers || {}) };
    const body = options.body || null;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(
      {
        hostname: target.hostname,
        path: target.pathname + target.search,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            code: res.statusCode,
            headers: res.headers,
            content: buffer.toString('utf8'),
            buffer,
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(options.timeout || 30000, () => req.destroy(new Error(`timeout: ${url}`)));
    req.end(body);
  });
}

const spider = await import(pathToFileURL(spiderPath).href);

for (const name of ['init', 'home', 'homeVod', 'category', 'detail', 'play', 'search', 'destroy']) {
  assert.equal(typeof spider.default?.[name], 'function', `Missing default.${name}`);
}

for (const name of [
  'BASE',
  'CATEGORIES',
  'buildCategoryUrl',
  'buildSearchUrl',
  'parseNuxtMoviesFromHtml',
  'formatVodItem',
  'formatVodDetail',
  'encodeVodId',
  'decodeVodId',
  'normalizeUrl',
]) {
  assert.notEqual(spider[name], undefined, `Missing export ${name}`);
}

assert.equal(spider.BASE, BASE);
assert.deepEqual(
  spider.CATEGORIES.map((item) => [item.type_id, item.type_name]),
  [
    ['recommend', '推荐'],
    ['selected_all', '精选全部'],
    ['selected_9', '巨乳'],
    ['selected_22', '嫩妹'],
    ['selected_19', '吃瓜'],
    ['selected_21', '网红'],
    ['selected_12', '抖音风'],
    ['selected_20', 'COS'],
    ['selected_24', '综艺'],
  ]
);

const home = JSON.parse(spider.default.home(false));
assert.equal(home.class.length, 9);
assert.deepEqual(home.class[0], { type_id: 'recommend', type_name: '推荐' });

assert.equal(spider.buildCategoryUrl('recommend', 1), `${BASE}/`);
assert.equal(spider.buildCategoryUrl('recommend', 2), `${BASE}/?page=2`);
assert.equal(spider.buildCategoryUrl('selected_all', 1), `${BASE}/selected/all/`);
assert.equal(spider.buildCategoryUrl('selected_9', 1), `${BASE}/selected/9/`);
assert.equal(spider.buildSearchUrl('女', 1), `${BASE}/?search=%E5%A5%B3`);
assert.equal(spider.buildSearchUrl('女', 2), `${BASE}/?search=%E5%A5%B3&page=2`);

const commonHeaders = {
  'User-Agent': spider.UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  Referer: `${BASE}/`,
};

const pageCache = new Map();
for (const url of [
  spider.buildCategoryUrl('recommend', 1),
  spider.buildCategoryUrl('recommend', 2),
  spider.buildCategoryUrl('selected_all', 1),
  spider.buildSearchUrl('女', 1),
]) {
  const res = await httpsRequest(url, { headers: commonHeaders, timeout: 30000 });
  assert.equal(res.code, 200, `HTML fetch should pass for ${url}`);
  assert.match(res.content, /__NUXT_DATA__/, `HTML should include Nuxt data for ${url}`);
  pageCache.set(url, res.content);
}

const recommendRows = spider.parseNuxtMoviesFromHtml(pageCache.get(spider.buildCategoryUrl('recommend', 1)));
assert.ok(recommendRows.length >= 5, 'recommend SSR data should include movies');
assert.ok(recommendRows[0].id, 'movie should include id');
assert.ok(recommendRows[0].name, 'movie should include name');
assert.match(recommendRows[0].img, /^https?:\/\//, 'movie should include image');
assert.ok(Array.isArray(recommendRows[0].play_links), 'movie should include play_links');
assert.match(
  recommendRows[0].play_links[0].m3u8_url,
  /^https:\/\/a91hlfst\.a6cfwbq\.com\/api\/m3u8\/p\/.+\.m3u8$/,
  'movie should include normalized m3u8 URL'
);

const encoded = spider.encodeVodId(recommendRows[0]);
assert.match(encoded, /^a91:/);
assert.equal(spider.decodeVodId(encoded).id, recommendRows[0].id);

const item = spider.formatVodItem(recommendRows[0]);
assert.equal(item.vod_name, recommendRows[0].name);
assert.match(item.vod_pic, /^https?:\/\//);
assert.match(item.vod_id, /^a91:/);

globalThis.req = (url, options = {}) => {
  const normalized = spider.normalizeUrl(url);
  const content = pageCache.get(normalized);
  if (!content) throw new Error(`Unexpected req URL ${normalized} ${JSON.stringify(options)}`);
  return { code: 200, content, headers: {} };
};

const categoryPage1 = JSON.parse(spider.default.category('recommend', 1));
assert.equal(categoryPage1.page, 1);
assert.ok(categoryPage1.pagecount > 1);
assert.ok(categoryPage1.list.length >= 5);

const categoryPage2 = JSON.parse(spider.default.category('recommend', 2));
assert.equal(categoryPage2.page, 2);
assert.ok(categoryPage2.list.length >= 5);
assert.notEqual(spider.decodeVodId(categoryPage1.list[0].vod_id).id, spider.decodeVodId(categoryPage2.list[0].vod_id).id);

const selected = JSON.parse(spider.default.category('selected_all', 1));
assert.equal(selected.page, 1);
assert.ok(selected.list.length >= 10);

const search = JSON.parse(spider.default.search('女', true, 1));
assert.ok(search.list.length >= 5);

const detail = JSON.parse(spider.default.detail(categoryPage1.list[0].vod_id));
assert.equal(detail.list.length, 1);
assert.equal(detail.list[0].vod_id, categoryPage1.list[0].vod_id);
assert.equal(detail.list[0].vod_play_from, '抖阴');
assert.match(detail.list[0].vod_play_url, /线路1\$https:\/\/a91hlfst\.a6cfwbq\.com\/api\/m3u8\/p\/.+\.m3u8/);

const playUrl = detail.list[0].vod_play_url.split('$')[1].split('#')[0];
const play = JSON.parse(spider.default.play('抖阴', playUrl));
assert.equal(play.parse, 0);
assert.equal(play.url, playUrl);
assert.equal(play.header.Referer, `${BASE}/`);

const m3u8 = await httpsRequest(play.url, {
  headers: play.header,
  timeout: 30000,
});
assert.equal(m3u8.code, 200);
assert.match(m3u8.content, /^#EXTM3U/);
assert.match(m3u8.content, /#EXT-X-KEY:METHOD=AES-128/);

console.log('A91 source verification passed');
