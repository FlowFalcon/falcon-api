// fetchSite.js — helper anti-403 Cloudflare buat scraper donghua.
// Masalah: IP datacenter (Vercel) di-block anichin (403), IP rumah lolos.
// Helper ini: header browser penuh + retry/backoff + dukung proxy opsional.
// Set PROXY_URL di env (http://user:pass@host:port) bila 403 tetap muncul dari server.
const axios = require('axios');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

function agentOpts(target) {
  const proxy = process.env.PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxy) return {};
  try {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const agent = new HttpsProxyAgent(proxy);
    return { httpsAgent: agent, proxy: false };
  } catch {
    return { proxy };
  }
}

// GET dengan retry khusus 403/429/5xx. Lempar error terakhir bila gagal semua.
async function fetchSite(url, { tries = 3, timeout = 15000, headers = {} } = {}) {
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    try {
      const { data } = await axios.get(url, {
        headers: { ...BROWSER_HEADERS, ...headers },
        timeout,
        ...agentOpts(url),
      });
      return data;
    } catch (e) {
      lastErr = e;
      const s = e.response?.status;
      if (s !== 403 && s !== 429 && !(s >= 500)) break; // 404/dll tak usah retry
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

module.exports = { fetchSite, BROWSER_HEADERS };
