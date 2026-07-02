import assert from 'node:assert/strict';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const configPath = path.join(root, 'app/src/main/assets/libretv_config.json');
const spiderPath = path.join(root, 'app/src/main/assets/js/aida.js');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const site = config.sites.find((item) => item.key === 'aida');

assert.ok(site, 'Missing aida site in libretv_config.json');
assert.equal(site.name, '爱豆A');
assert.equal(site.type, 3);
assert.equal(site.api, 'assets://js/aida.js');
assert.equal(site.searchable, 1);
assert.equal(site.quickSearch, 1);
assert.equal(site.changeable, 1);
assert.ok(fs.existsSync(spiderPath), 'Missing app/src/main/assets/js/aida.js');

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const headers = options.headers || {};
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

globalThis.req = (url, options = {}) => {
  throw new Error(`Synchronous req is not available in this Node verifier: ${url} ${JSON.stringify(options)}`);
};

const spider = await import(pathToFileURL(spiderPath).href);
for (const name of ['init', 'home', 'homeVod', 'category', 'detail', 'play', 'search', 'destroy']) {
  assert.equal(typeof spider.default?.[name], 'function', `Missing default.${name}`);
}

for (const name of [
  'BASE',
  'CATEGORIES',
  'buildApiRequest',
  'decodeApiResponse',
  'formatVodItem',
  'buildM3u8Url',
  'mapSearchResult',
]) {
  assert.notEqual(spider[name], undefined, `Missing export ${name}`);
}

assert.equal(spider.BASE, 'https://ww22.aida1.cyou');
assert.deepEqual(
  spider.CATEGORIES.map((item) => [item.type_id, item.type_name]),
  [
    ['1', '国产'],
    ['5', '传媒'],
    ['2', '日韩'],
    ['3', '欧美'],
    ['4', '动漫'],
    ['6', '免费'],
  ]
);

const home = JSON.parse(spider.default.home(false));
assert.equal(home.class.length, 6);
assert.deepEqual(home.class[0], { type_id: '1', type_name: '国产' });

const sampleRow = {
  vodId: 67758,
  vodName: '[粉嫩学生妹]萝莉学生妹开房被操颜射呻吟合集',
  vodPic: 'https://pdf1.liyao.fun/oa/240904/dbdfbbe987f551e0b946962a70c677e8.ttf',
  vodTime: '2026-06-29',
  vodHits: 204,
  typeId: 1,
};
assert.deepEqual(spider.formatVodItem(sampleRow), {
  vod_id: '67758',
  vod_name: sampleRow.vodName,
  vod_pic: sampleRow.vodPic,
  vod_remarks: '2026-06-29',
});

assert.equal(
  spider.buildM3u8Url('dbdfbbe987f551e0b946962a70c677e8', 2),
  'https://ww22.aida1.cyou/api/m3u8/dbdfbbe987f551e0b946962a70c677e8.m3u8?line=2'
);

const request = spider.buildApiRequest('/vod/info.php', { id: '67758' }, 1783000081834);
assert.equal(request.url, 'https://ww22.aida1.cyou/awsapi/vod/info.php?md5=674153c027e39');
assert.match(request.body, /^data=/);

const apiResponse = await httpsRequest(request.url, {
  method: 'POST',
  body: request.body,
  headers: request.headers,
  timeout: 30000,
});
assert.equal(apiResponse.code, 200);
const decoded = spider.decodeApiResponse(apiResponse.content, request.t);
assert.equal(decoded.vodId, 67758);
assert.equal(decoded.code, 'dbdfbbe987f551e0b946962a70c677e8');

const categoryRequest = spider.buildApiRequest('/vod/search.php', { type: '1', by: 'vod_score', order: 'desc', page: 1, size: 8, count: 8 });
const categoryResponse = await httpsRequest(categoryRequest.url, {
  method: 'POST',
  body: categoryRequest.body,
  headers: categoryRequest.headers,
  timeout: 30000,
});
assert.equal(categoryResponse.code, 200);
const categoryDecoded = spider.decodeApiResponse(categoryResponse.content, categoryRequest.t);
assert.ok(Array.isArray(categoryDecoded.rows), 'category rows should be an array');
assert.ok(categoryDecoded.rows.length > 0, 'category should return at least one vod item');
const categoryJson = JSON.parse(spider.mapSearchResult({ code: 200, data: categoryDecoded }, 'list', 1));
assert.ok(categoryJson.list.length > 0, 'mapped category should return at least one vod item');
assert.match(categoryJson.list[0].vod_id, /^\d+$/);
assert.ok(categoryJson.list[0].vod_name);

const detailJson = JSON.parse(spider.mapSearchResult({ code: 200, data: decoded }, 'detail'));
assert.equal(detailJson.list.length, 1);
assert.equal(detailJson.list[0].vod_id, '67758');
assert.equal(detailJson.list[0].vod_play_from, '爱豆');
assert.match(detailJson.list[0].vod_play_url, /线路1\$https:\/\/ww22\.aida1\.cyou\/api\/m3u8\/dbdfbbe987f551e0b946962a70c677e8\.m3u8\?line=1/);
assert.match(detailJson.list[0].vod_play_url, /线路2\$https:\/\/ww22\.aida1\.cyou\/api\/m3u8\/dbdfbbe987f551e0b946962a70c677e8\.m3u8\?line=2/);

const play = JSON.parse(spider.default.play('爱豆', spider.buildM3u8Url(decoded.code, 1)));
assert.equal(play.parse, 0);
assert.equal(play.url, spider.buildM3u8Url(decoded.code, 1));
assert.equal(play.header.Referer, 'https://ww22.aida1.cyou/');

const m3u8 = await httpsRequest(play.url, {
  headers: play.header,
  timeout: 30000,
});
assert.equal(m3u8.code, 200);
assert.match(m3u8.content, /^#EXTM3U/);
assert.match(m3u8.content, /#EXT-X-KEY:METHOD=AES-128/);
assert.match(m3u8.content, /\/api\/m3u8\/md5\/dbdfbbe987f551e0b946962a70c677e8\.php/);

console.log('Aida source verification passed');
