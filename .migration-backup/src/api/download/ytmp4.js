const axios = require('axios');
const https = require('https');
const { URL } = require('url');

// ─── CONFIG ──────────────────────────────────────────────
const BASE_URL = "https://hub.ytconvert.org/api/download";
const HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Origin": "https://media.ytmp3.gg",
  "Referer": "https://media.ytmp3.gg/",
  "User-Agent": "Mozilla/5.0"
};

const SAVENOW = {
  api: "https://p.savenow.to",
  key: "dfcb6d76f2f6a9894gjkege8a4ab232222",
  agent: new https.Agent({ rejectUnauthorized: false })
};

const SS_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Content-Type': 'application/x-www-form-urlencoded',
  'origin': 'https://ssyoutube.online',
  'referer': 'https://ssyoutube.online/en12/'
};

// ─── UTILS ──────────────────────────────────────────────
const delay = ms => new Promise(res => setTimeout(res, ms));

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/")[1];
    if (u.pathname.includes("/shorts/")) return u.pathname.split("/shorts/")[1];
    return null;
  } catch {
    return null;
  }
}

function buildThumbnail(url, fallback = null) {
  const id = extractVideoId(url);
  if (!id) return fallback;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

// ─── PRIMARY: ytconvert.org ─────────────────────────────
async function requestConvert(payload) {
  const res = await axios.post(BASE_URL, payload, { headers: HEADERS });
  return res.data;
}

async function waitUntilReady(statusUrl, maxWaitMs = 60000) {
  const startTime = Date.now();
  while (true) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error("Timeout: API tidak merespon dalam 60 detik.");
    }
    try {
      const { data } = await axios.get(statusUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000
      });
      if (data.status === "completed" || data.downloadUrl) return data;
      if (data.status === "error") throw new Error("API merespon status error.");
    } catch (e) {
      if (e.message && e.message.includes("Timeout:")) throw e;
    }
    await delay(3000);
  }
}

async function primaryMP3(url) {
  const convert = await requestConvert({
    url,
    os: "windows",
    output: { type: "audio", format: "mp3" }
  });
  const status = await waitUntilReady(convert.statusUrl);
  return {
    title: convert.title,
    downloadUrl: status.downloadUrl,
    thumbnail: buildThumbnail(url)
  };
}

// ─── SECONDARY: lbserver ──────────────────────────────
async function secondaryDownload(url, format = "128") {
  const params = { format: "mp3", audio_quality: format, url };
  const { data } = await axios.get("https://p.lbserver.xyz/ajax/download.php", { params });
  if (!data?.progress_url) throw new Error("Progress URL tidak ditemukan.");
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const { data: res } = await axios.get(data.progress_url);
        if (res.progress >= 1000) {
          resolve({
            title: data.title,
            downloadUrl: res.download_url,
            thumbnail: data.info?.image
          });
        } else setTimeout(poll, 500);
      } catch (e) {
        setTimeout(poll, 500);
      }
    };
    poll();
  });
}

// ─── TERTIARY: savenow.to ──────────────────────────────
async function tertiaryDownload(url) {
  const { data } = await axios.get(`${SAVENOW.api}/ajax/download.php`, {
    params: { format: "mp3", url, api: SAVENOW.key },
    httpsAgent: SAVENOW.agent
  });
  
  for (let i = 0; i < 40; i++) {
    try {
      const { data: res } = await axios.get(data.progress_url, { httpsAgent: SAVENOW.agent });
      if (res.success && res.download_url) {
        return {
          title: data.info?.title,
          downloadUrl: res.download_url,
          thumbnail: data.info?.image
        };
      }
    } catch {}
    await delay(2500);
  }
  throw new Error("Timeout: SaveNow terlalu lama merespon.");
}

// ─── QUATERNARY: ssyoutube ──────────────────────────────
async function quaternaryDownload(url) {
  const r = await fetch("https://ssyoutube.online/yt-video-detail/", {
    method: "POST",
    headers: SS_HEADERS,
    body: new URLSearchParams({ videoURL: url })
  });
  const html = await r.text();
  const title = (html.match(/videoTitle[^>]*>(.*?)</) || [])[1] || "Unknown";
  const thumbnail = (html.match(/thumbnail" src="([^"]+)/) || [])[1];
  
  // Ambil link audio MP3 dari AJAX
  const req = await fetch("https://ssyoutube.online/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: SS_HEADERS,
    body: new URLSearchParams({ action: "get_mp3_conversion_url", videoUrl: url })
  });
  const json = await req.json();
  if (json.data && json.data.url) {
    return { title, thumbnail, downloadUrl: json.data.url };
  }
  
  throw new Error("SSYoutube tidak menemukan link audio.");
}

// ─── MAIN EXPORT ─────────────────────────────────────────
module.exports = (app) => {
  app.get('/download/ytmp3', async (req, res) => {
    try {
      const { url, quality = "128" } = req.query;
      if (!url) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "url" wajib diisi'
        });
      }

      let result = null;
      let errors = [];

      // Coba Primary
      try {
        result = await primaryMP3(url);
      } catch (e1) {
        errors.push(`Primary: ${e1.message}`);
        console.error(e1.message || e1);
        
        // Coba Secondary
        try {
          result = await secondaryDownload(url, quality);
        } catch (e2) {
          errors.push(`Secondary: ${e2.message}`);
          console.error(e2.message || e2);
          
          // Coba Tertiary
          try {
            result = await tertiaryDownload(url);
          } catch (e3) {
            errors.push(`Tertiary: ${e3.message}`);
            console.error(e3.message || e3);
            
            // Coba Quaternary
            try {
              result = await quaternaryDownload(url);
            } catch (e4) {
              errors.push(`Quaternary: ${e4.message}`);
              console.error(e4.message || e4);
              throw new Error(`Semua server gagal: ${errors.join('; ')}`);
            }
          }
        }
      }

      if (!result || !result.downloadUrl) {
        return res.status(500).json({
          status: false,
          error: 'Gagal mendapatkan link download dari semua server'
        });
      }

      res.json({
        status: true,
        creator: "AxlyDev",
        data: {
          judul: result.title || "-",
          thumbnail: result.thumbnail || buildThumbnail(url),
          download_url: result.downloadUrl,
          quality: quality,
          source: result.source || "ytconvert"
        }
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message || "Terjadi kesalahan server"
      });
    }
  });
};
