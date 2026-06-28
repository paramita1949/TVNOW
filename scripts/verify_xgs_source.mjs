import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const configPath = path.join(root, 'app/src/main/assets/libretv_config.json');
const spiderPath = path.join(root, 'app/src/main/assets/js/xgs.js');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const site = config.sites.find((item) => item.key === 'xgs');

assert.ok(site, 'Missing xgs site in libretv_config.json');
assert.equal(site.name, '西瓜');
assert.equal(site.type, 3);
assert.equal(site.api, 'assets://js/xgs.js');
assert.equal(site.searchable, 1);
assert.equal(site.quickSearch, 1);
assert.equal(site.changeable, 1);
assert.match(site.click, /checkbox/);
assert.match(site.click, /#Link/);
assert.ok(fs.existsSync(spiderPath), 'Missing app/src/main/assets/js/xgs.js');

const spider = await import(pathToFileURL(spiderPath).href);
for (const name of ['init', 'home', 'homeVod', 'category', 'detail', 'play', 'search', 'destroy']) {
  assert.equal(typeof spider.default?.[name], 'function', `Missing default.${name}`);
}

for (const name of ['buildGateClick', 'extractVideoItems', 'extractVideoDetail', 'normalizeUrl', 'htmlDecode']) {
  assert.equal(typeof spider[name], 'function', `Missing export ${name}`);
}

assert.equal(
  spider.buildGateClick(),
  "document.querySelector('#checkbox')?.click();document.querySelector('#Link')?.click();"
);

const listHtml = `
<div class="list">
  <a href="/video/384764.html">
    <img src="/thumb/ck/212335.jpg">
    <p>PAP-158 中高年世代へ捧げる昭和官能ラマ7编×4时间</p>
    <span>2026-06-23</span>
  </a>
  <a href="https://ads.invalid/"><img src="/ad.jpg"><p>ad</p></a>
  <a href="/video/165284.html">
    <img data-src="/thumb/ck/91309.jpg">
    <p>FC2PPV-2722196-只有一次经验的超纯情少女</p>
    <span>2025-10-26</span>
  </a>
</div>`;

const items = spider.extractVideoItems(listHtml);
assert.equal(items.length, 2);
assert.deepEqual(items[0], {
  vod_id: '384764',
  vod_name: 'PAP-158 中高年世代へ捧げる昭和官能ラマ7编×4时间',
  vod_pic: 'https://xgs262.shop/thumb/ck/212335.jpg',
  vod_remarks: '2026-06-23',
});

const detailHtml = `
<h1><a href="/p/有码视频">有码视频</a>PAP-158 中高年世代へ捧げる昭和官能ラマ7编×4时间</h1>
<iframe src="https://surumi.shop/ck/?url=https://t27.cdn2020.com/video/m3u8/2026/06/23/08e8b0ee/index.m3u8&id=212335"></iframe>
<img src="/thumb/ck/212335.jpg">`;

const detail = spider.extractVideoDetail(detailHtml, '384764');
assert.equal(detail.vod_id, '384764');
assert.equal(detail.vod_name, 'PAP-158 中高年世代へ捧げる昭和官能ラマ7编×4时间');
assert.equal(detail.type_name, '有码视频');
assert.equal(detail.vod_play_from, '西瓜');
assert.equal(detail.vod_play_url, '播放$https://xgs262.shop/video/384764.html');

console.log('XGS source verification passed');
