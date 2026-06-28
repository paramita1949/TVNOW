import { Crypto } from './lib/cat.js';

const BASE = 'https://ttp231.shop';
const UA = 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';
const CATEGORIES = ['国产视频', '中文字幕', '高清欧美', '欧美视频', '性吧日本', '去码重生', '无码视频', '有码视频'];

function vodResult(list) {
    return JSON.stringify({ list });
}

function absUrl(value) {
    if (!value) return '';
    if (value.startsWith('//')) return 'https:' + value;
    if (value.startsWith('http')) return value.replace(/&amp;/g, '&');
    if (value.startsWith('/')) return BASE + value;
    return BASE + '/' + value;
}

function strip(value) {
    return String(value || '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/\s+/g, ' ')
        .trim();
}

function parseSetCookie(headers) {
    const jar = {};
    const raw = headers?.['set-cookie'] || headers?.['Set-Cookie'] || '';
    const values = Array.isArray(raw) ? raw : [raw];
    values.forEach((item) => {
        String(item || '').split(/,(?=\s*[^;,=]+=[^;,]+)/).forEach((part) => {
            const pair = part.split(';')[0];
            const index = pair.indexOf('=');
            if (index > 0) jar[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
        });
    });
    return jar;
}

function cookieHeader(jar) {
    return Object.keys(jar).map((key) => key + '=' + jar[key]).join('; ');
}

function bytesToWordArray(bytes) {
    const words = [];
    for (let i = 0; i < bytes.length; i++) words[i >>> 2] = (words[i >>> 2] || 0) | (bytes[i] << (24 - (i % 4) * 8));
    return Crypto.lib.WordArray.create(words, bytes.length);
}

function wordArrayToBytes(wordArray) {
    const bytes = [];
    const words = wordArray.words;
    for (let i = 0; i < wordArray.sigBytes; i++) bytes.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
    return bytes;
}

function base64ToBytes(text) {
    return wordArrayToBytes(Crypto.enc.Base64.parse(text));
}

function base64ToUtf8(text) {
    return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(text));
}

function decryptHtml(html) {
    const match = html.match(/var\s+([A-Za-z_$][\w$]*)\s*=\s*"([^"]+)"\s*,\s*([A-Za-z_$][\w$]*)\s*=\s*\[([^\]]+)\]/s);
    if (!match) return html;
    const encrypted = match[2].split('').reverse().join('');
    const keyBase64 = Array.from(match[4].matchAll(/"([^"]+)"/g)).map((item) => base64ToUtf8(item[1])).join('');
    const allBytes = base64ToBytes(encrypted);
    const iv = bytesToWordArray(allBytes.slice(0, 16));
    const ciphertext = bytesToWordArray(allBytes.slice(16));
    const key = Crypto.enc.Base64.parse(keyBase64);
    const plain = Crypto.AES.decrypt({ ciphertext }, key, { iv, mode: Crypto.mode.CTR, padding: Crypto.pad.NoPadding });
    return Crypto.enc.Utf8.stringify(plain);
}

function request(url, extraHeaders = {}) {
    return req(url, {
        headers: Object.assign({
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }, extraHeaders),
        timeout: 15000
    });
}

function fetchDecoded(url) {
    const first = request(url);
    const jar = parseSetCookie(first.headers || {});
    if (jar.Challenge) jar['UID_' + jar.Challenge] = 'ok';
    const second = request(url, {
        'Cookie': cookieHeader(jar),
        'Referer': url
    });
    return decryptHtml(second.content || '');
}

function parseTitle(html) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? strip(match[1]).replace(/,?偷偷啪$/, '') : '';
}

function parseClasses(html) {
    const found = {};
    Array.from(html.matchAll(/<a[^>]+href=["']([^"']*\/videos\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)).forEach((match) => {
        const name = strip(match[2]).replace(/更多.*/, '').trim();
        if (CATEGORIES.indexOf(name) >= 0) found[name] = '/videos/' + encodeURIComponent(name);
    });
    return CATEGORIES.filter((name) => found[name]).map((name) => ({ type_id: found[name], type_name: name }));
}

function parseVideos(html) {
    const list = [];
    Array.from(html.matchAll(/<a\b([^>]*href=["'][^"']*\/video\/\d+\.html[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi)).forEach((match) => {
        const tag = match[1];
        const inner = match[2];
        const href = tag.match(/href=["']([^"']+)/i)?.[1] || '';
        const id = (href.match(/\/video\/(\d+)\.html/i) || [])[1] || href;
        if (!id || list.find((item) => item.vod_id === id)) return;
        const title = tag.match(/title=["']([^"']+)/i)?.[1] || strip(inner);
        const pic = inner.match(/data-src=["']([^"']+)/i)?.[1] || inner.match(/data-original=["']([^"']+)/i)?.[1] || inner.match(/src=["']([^"']+)/i)?.[1] || '';
        const date = inner.match(/<i[^>]*class=["'][^"']*time[^"']*["'][^>]*>([\s\S]*?)<\/i>/i)?.[1] || '';
        list.push({
            vod_id: id,
            vod_name: strip(title).replace(/\s+\d{4}-\d{2}-\d{2}$/, ''),
            vod_pic: absUrl(pic),
            vod_remarks: strip(date)
        });
    });
    return list;
}

function maxPage(html) {
    let page = 1;
    Array.from(html.matchAll(/[?&]page=(\d+)/gi)).forEach((match) => page = Math.max(page, Number(match[1])));
    return page;
}

function extractM3u8(html) {
    const wrapped = Array.from(html.matchAll(/https?:\/\/[^"'<>\\\s]+\/ck\/\?url=([^"'<>\\\s&]+)[^"'<>\\\s]*/gi))[0];
    if (wrapped) return decodeURIComponent(wrapped[1].replace(/&amp;/g, '&'));
    const direct = Array.from(html.matchAll(/https?:\/\/[^"'<>\\\s]+?\.m3u8[^"'<>\\\s]*/gi))[0];
    return direct ? direct[0].replace(/&amp;/g, '&') : '';
}

function init() {
}

function home() {
    const html = fetchDecoded(BASE + '/');
    return JSON.stringify({
        class: parseClasses(html),
        filters: {}
    });
}

function homeVod() {
    const html = fetchDecoded(BASE + '/');
    return vodResult(parseVideos(html));
}

function category(tid, pg) {
    const page = Number(pg || '1');
    const url = absUrl(tid) + (page > 1 ? '?page=' + page : '');
    const html = fetchDecoded(url);
    const pagecount = maxPage(html);
    return JSON.stringify({
        page,
        pagecount,
        limit: 22,
        total: pagecount * 22,
        list: parseVideos(html)
    });
}

function detail(id) {
    const html = fetchDecoded(BASE + '/video/' + id + '.html');
    const url = extractM3u8(html);
    const title = parseTitle(html);
    const pic = (html.match(/data-src=["']([^"']+)/i) || html.match(/data-original=["']([^"']+)/i) || html.match(/src=["']([^"']+)/i) || [])[1] || '';
    return vodResult([{
        vod_id: id,
        vod_name: title || id,
        vod_pic: absUrl(pic),
        vod_content: title || id,
        vod_play_from: 'TTP231',
        vod_play_url: (title || id) + '$' + url
    }]);
}

function play(flag, id) {
    return JSON.stringify({
        parse: 0,
        flag,
        url: id,
        header: {
            'User-Agent': UA,
            'Referer': 'https://surumi.shop/'
        }
    });
}

function search(key, quick, pg) {
    const page = Number(pg || '1');
    const url = BASE + '/search/' + encodeURIComponent(key) + (page > 1 ? '?page=' + page : '');
    const html = fetchDecoded(url);
    const pagecount = maxPage(html);
    return JSON.stringify({
        page,
        pagecount,
        limit: 22,
        total: pagecount * 22,
        list: parseVideos(html)
    });
}

function destroy() {
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, play, search, destroy };
}

export default { init, home, homeVod, category, detail, play, search, destroy };
