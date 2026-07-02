import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const configPath = path.join(root, 'app/src/main/assets/libretv_config.json');
const spiderPath = path.join(root, 'app/src/main/assets/js/madou.js');
const BASE = 'https://madou.club';
const DASH_BASE = 'https://dash.madou.club';

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const site = config.sites.find((item) => item.key === 'madou');

assert.ok(site, 'Missing madou site in libretv_config.json');
assert.equal(site.name, '麻豆社');
assert.equal(site.type, 3);
assert.equal(site.api, 'assets://js/madou.js');
assert.equal(site.searchable, 1);
assert.equal(site.quickSearch, 1);
assert.equal(site.changeable, 1);
assert.ok(fs.existsSync(spiderPath), 'Missing app/src/main/assets/js/madou.js');

function request(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'http:' ? http : https;
    const headers = { ...(options.headers || {}) };
    const body = options.body || null;
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const req = client.request(
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
  'BASE',
  'DASH_BASE',
  'SOURCE',
  'CATEGORIES',
  'buildCategoryUrl',
  'buildSearchUrl',
  'parseListFromHtml',
  'parseDetailFromHtml',
  'parseShareFromHtml',
  'formatVodItem',
  'formatVodDetail',
  'normalizeUrl',
]) {
  assert.notEqual(spider[name], undefined, `Missing export ${name}`);
}

assert.equal(spider.BASE, BASE);
assert.equal(spider.DASH_BASE, DASH_BASE);
assert.equal(spider.SOURCE, '麻豆社');
assert.ok(spider.CATEGORIES.length >= 20, 'madou should expose website categories');
assert.deepEqual(spider.CATEGORIES[0], { type_id: 'latest', type_name: '最新更新' });
assert.ok(spider.CATEGORIES.some((item) => item.type_name === '麻豆传媒'), 'Missing 麻豆传媒 category');
assert.ok(spider.CATEGORIES.some((item) => item.type_name === '抖阴'), 'Missing 抖阴 category');

const home = JSON.parse(spider.default.home(false));
assert.equal(home.class.length, spider.CATEGORIES.length);
assert.deepEqual(home.class[0], { type_id: 'latest', type_name: '最新更新' });

const madouMedia = spider.CATEGORIES.find((item) => item.type_name === '麻豆传媒');
assert.ok(madouMedia?.type_id, 'Missing 麻豆传媒 category id');

assert.equal(spider.buildCategoryUrl('latest', 1), `${BASE}/`);
assert.equal(spider.buildCategoryUrl('latest', 2), `${BASE}/page/2/`);
assert.equal(spider.buildCategoryUrl(madouMedia.type_id, 1), `${BASE}/category/%e9%ba%bb%e8%b1%86%e4%bc%a0%e5%aa%92`);
assert.equal(spider.buildCategoryUrl(madouMedia.type_id, 2), `${BASE}/category/%e9%ba%bb%e8%b1%86%e4%bc%a0%e5%aa%92/page/2/`);
assert.equal(spider.buildSearchUrl('女', 1), `${BASE}/?s=%E5%A5%B3`);
assert.equal(spider.buildSearchUrl('女', 2), `${BASE}/page/2/?s=%E5%A5%B3`);

const commonHeaders = {
  'User-Agent': spider.UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  Referer: `${BASE}/`,
};

const pageCache = new Map();
for (const url of [
  spider.buildCategoryUrl('latest', 1),
  spider.buildCategoryUrl('latest', 2),
  spider.buildCategoryUrl(madouMedia.type_id, 1),
  spider.buildSearchUrl('女', 1),
]) {
  const res = await request(url, { headers: commonHeaders, timeout: 30000 });
  assert.equal(res.code, 200, `HTML fetch should pass for ${url}`);
  assert.match(res.content, /<article\b/i, `HTML should include article list for ${url}`);
  pageCache.set(spider.normalizeUrl(url), res.content);
}

const latestRows = spider.parseListFromHtml(pageCache.get(spider.buildCategoryUrl('latest', 1)));
assert.ok(latestRows.length >= 10, 'latest page should include articles');
assert.match(latestRows[0].id, /^https:\/\/madou\.club\/.+\.html$/);
assert.ok(latestRows[0].name, 'article should include title');
assert.match(latestRows[0].pic, /^https:\/\/madou\.club\/covers\/.+\.(jpg|png|webp)$/i, 'article should include cover image');
assert.ok(latestRows[0].remarks, 'article should include remarks');

const categoryRows = spider.parseListFromHtml(pageCache.get(spider.buildCategoryUrl(madouMedia.type_id, 1)));
assert.ok(categoryRows.length >= 10, 'category page should include articles');

const searchRows = spider.parseListFromHtml(pageCache.get(spider.buildSearchUrl('女', 1)));
assert.ok(searchRows.length >= 5, 'search page should include articles');

const item = spider.formatVodItem(latestRows[0]);
assert.equal(item.vod_name, latestRows[0].name);
assert.match(item.vod_pic, /^https?:\/\//);
assert.match(item.vod_id, /^madou:/);

const detailUrl = latestRows[0].id;
const detailRes = await request(detailUrl, { headers: commonHeaders, timeout: 30000 });
assert.equal(detailRes.code, 200, 'detail page should fetch');
assert.match(detailRes.content, /dash\.madou\.club\/share\//, 'detail should include dash share iframe');
pageCache.set(spider.normalizeUrl(detailUrl), detailRes.content);

const parsedDetail = spider.parseDetailFromHtml(detailRes.content, latestRows[0]);
assert.equal(parsedDetail.id, latestRows[0].id);
assert.ok(parsedDetail.name, 'detail should include name');
assert.match(parsedDetail.shareUrl, /^https:\/\/dash\.madou\.club\/share\/[A-Za-z0-9]+$/, 'detail should include share URL');

const shareRes = await request(parsedDetail.shareUrl, {
  headers: { ...commonHeaders, Referer: detailUrl },
  timeout: 30000,
});
assert.equal(shareRes.code, 200, 'share iframe should fetch');
assert.match(shareRes.content, /var\s+m3u8\s*=/, 'share should include m3u8 variable');
pageCache.set(spider.normalizeUrl(parsedDetail.shareUrl), shareRes.content);

const share = spider.parseShareFromHtml(shareRes.content, parsedDetail.shareUrl);
assert.match(share.url, /^https:\/\/dash\.madou\.club\/videos\/[A-Za-z0-9]+\/index\.m3u8\?token=.+/, 'share should expose tokenized hls');
assert.match(share.pic, /^https:\/\/dash\.madou\.club\/videos\/[A-Za-z0-9]+\/poster\.jpg$/, 'share should expose poster');

globalThis.req = (url, options = {}) => {
  const normalized = spider.normalizeUrl(url, url.startsWith(DASH_BASE) ? DASH_BASE : BASE);
  const content = pageCache.get(normalized);
  if (!content) throw new Error(`Unexpected req URL ${normalized} ${JSON.stringify(options)}`);
  return { code: 200, content, headers: {} };
};

const categoryPage1 = JSON.parse(spider.default.category('latest', 1));
assert.equal(categoryPage1.page, 1);
assert.ok(categoryPage1.pagecount > 1);
assert.ok(categoryPage1.list.length >= 10);

const categoryPage2 = JSON.parse(spider.default.category('latest', 2));
assert.equal(categoryPage2.page, 2);
assert.ok(categoryPage2.list.length >= 10);
assert.notEqual(spider.decodeVodId(categoryPage1.list[0].vod_id).id, spider.decodeVodId(categoryPage2.list[0].vod_id).id);

const siteCategory = JSON.parse(spider.default.category(madouMedia.type_id, 1));
assert.equal(siteCategory.page, 1);
assert.ok(siteCategory.list.length >= 10);

const search = JSON.parse(spider.default.search('女', true, 1));
assert.equal(search.page, 1);
assert.ok(search.list.length >= 5);

const detail = JSON.parse(spider.default.detail(item.vod_id));
assert.equal(detail.list.length, 1);
assert.equal(detail.list[0].vod_id, item.vod_id);
assert.equal(detail.list[0].vod_play_from, '麻豆社');
assert.match(detail.list[0].vod_play_url, /线路1\$https:\/\/dash\.madou\.club\/videos\/[A-Za-z0-9]+\/index\.m3u8\?token=/);

const playUrl = detail.list[0].vod_play_url.split('$')[1].split('#')[0];
const play = JSON.parse(spider.default.play('麻豆社', playUrl));
assert.equal(play.parse, 0);
assert.equal(play.url, playUrl);
assert.equal(play.header.Referer, parsedDetail.shareUrl);

const m3u8 = await request(play.url, {
  headers: play.header,
  timeout: 30000,
});
assert.equal(m3u8.code, 200);
assert.match(m3u8.content, /^#EXTM3U/);
assert.match(m3u8.content, /#EXT-X-KEY:METHOD=AES-128/);

console.log('Madou source verification passed');
