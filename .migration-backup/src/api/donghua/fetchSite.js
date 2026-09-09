// fetchSite.js — helper anti-403 + fallback mirror donghub/donghive.
// Env opsional:
//   DONGHUA_BASE_URL — paksa satu mirror (mis. https://donghive.vip)
//   PROXY_URL / HTTPS_PROXY / HTTP_PROXY — http://user:pass@host:port
//   (wajib diisi kalau IP server di-block sumber → 403 di semua endpoint)
const axios = require('axios');

const MIRRORS = (process.env.DONGHUA_BASE_URL
  ? [process.env.DONGHUA_BASE_URL]
  : ['https://donghub.vip', 'https://donghive.vip']
).map((s) => String(s).replace(/\/+$/, ''));

const BASE_URL = MIRRORS[0];

function baseHeaders(referer) {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': referer || `${BASE_URL}/`,
    'Upgrade-Insecure-Requests': '1',
    'Sec-Ch-Ua': '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
  };
}

const BROWSER_HEADERS = baseHeaders(`${BASE_URL}/`);

// Cookie-jar (axios-cookiejar-support + tough-cookie sudah di dependencies)
// supaya session/challenge cookie kebawa antar request. Fallback axios polos.
let client = axios;
try {
  const { wrapper } = require('axios-cookiejar-support');
  const { CookieJar } = require('tough-cookie');
  client = wrapper(axios.create({ jar: new CookieJar() }));
} catch (_e) {
  client = axios;
}

function agentOpts() {
  const proxy = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxy) return {};
  try {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    return { httpsAgent: new HttpsProxyAgent(proxy), proxy: false };
  } catch {
    return { proxy };
  }
}

function isOurs(url) {
  try {
    return /donghu[bi]\.|anichin\./i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function swapHost(url, base) {
  try {
    const u = new URL(url);
    const b = new URL(base);
    if (!isOurs(url)) return url; // bukan sumber kita → jangan diutak-atik
    u.protocol = b.protocol;
    u.hostname = b.hostname;
    u.port = b.port;
    return u.toString();
  } catch {
    return url;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GET dengan fallback mirror + retry 403/429/5xx. Return HTML, throw error terakhir.
async function fetchSite(url, { tries = 2, timeout = 15000, headers = {} } = {}) {
  const queue = isOurs(url) ? [...new Set(MIRRORS.map((b) => swapHost(url, b)))] : [url];
  let lastErr = null;
  for (const target of queue) {
    let referer = `${BASE_URL}/`;
    try {
      referer = `${new URL(target).origin}/`;
    } catch {}
    let fatal = false;
    for (let i = 0; i < tries; i++) {
      try {
        const { data } = await client.get(target, {
          headers: { ...baseHeaders(referer), ...headers },
          timeout,
          maxRedirects: 5,
          ...agentOpts(),
        });
        return data;
      } catch (e) {
        lastErr = e;
        const s = e.response?.status;
        if (s === 404) { fatal = true; break; } // konten memang tidak ada
        const retryable = s === 403 || s === 429 || (typeof s === 'number' && s >= 500) || !s;
        if (!retryable) { fatal = true; break; } // 400/dll → retry percuma
        await sleep(1000 * (i + 1) + Math.floor(Math.random() * 500));
      }
    }
    if (fatal) break;
  }
  throw lastErr;
}

// Petakan error upstream jadi { code, body } yang jujur.
// 403/429/5xx/timeout dari sumber BUKAN 500 generik.
function mapUpstreamError(e) {
  const s = e?.response?.status;
  if (s === 404) {
    return { code: 404, body: { error: 'Konten tidak ditemukan di sumber', note: 'Periksa kembali slug' } };
  }
  if (s === 403) {
    return {
      code: 502,
      body: {
        error: 'Upstream menolak akses (403 — IP server kemungkinan di-block sumber)',
        note: 'Set PROXY_URL di env, atau paksa mirror lain via DONGHUA_BASE_URL',
      },
    };
  }
  if (s === 429) {
    return {
      code: 503,
      body: { error: 'Upstream rate-limit (429)', note: 'Kurangi frekuensi request, coba lagi beberapa detik' },
    };
  }
  if (typeof s === 'number' && s >= 500) {
    return {
      code: 502,
      body: { error: `Upstream error (${s})`, note: 'Sumber lagi gangguan, coba lagi nanti' },
    };
  }
  if (!s) {
    return {
      code: 504,
      body: { error: 'Upstream tidak merespons (timeout/network)', note: 'Cek koneksi server ke donghub / set PROXY_URL' },
    };
  }
  return { code: 500, body: { error: e?.message || 'Unknown error' } };
}

module.exports = { fetchSite, mapUpstreamError, BROWSER_HEADERS, BASE_URL, MIRRORS };
