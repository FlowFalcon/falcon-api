// OTAKUDESU SCRAPER - KODE ASLI DARI DEFAN
const https = require('https');
const http = require('http');

const BASE_URL = 'https://otakudesu.blog';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'identity',
  'Referer': 'https://otakudesu.blog/',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: HEADERS }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function decodeHtml(str) {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripTags(str) {
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function parseSearchResults(html) {
  const results = [];
  const blocks = html.split(/(?=<a[^>]+href="https:\/\/otakudesu\.blog\/anime\/)/);
  for (const block of blocks) {
    const urlMatch = block.match(/href="(https:\/\/otakudesu\.blog\/anime\/[^"]+)"/);
    if (!urlMatch) continue;
    const titleMatch = block.match(/href="https:\/\/otakudesu\.blog\/anime\/[^"]+">([^<]+)<\/a>/);
    const ratingMatch = block.match(/Rating[^0-9]+([\d.]+)/i);
    const statusMatch = block.match(/Status\s*<\/[^>]+>\s*:\s*([^<]+)/i) || block.match(/Status\s*:\s*([^<\n]+)/i);
    const genreMatches = [...block.matchAll(/\/genres\/[^"]+">([^<]+)<\/a>/g)].map(m => m[1]);
    results.push({
      title: titleMatch ? decodeHtml(titleMatch[1]) : null,
      url: urlMatch[1],
      rating: ratingMatch ? ratingMatch[1] : null,
      status: statusMatch ? decodeHtml(stripTags(statusMatch[1])) : null,
      genres: genreMatches.length ? genreMatches : null,
    });
  }
  return results;
}

function parseDetailPage(html, url) {
  const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? decodeHtml(stripTags(titleMatch[1])) : null;
  const ratingMatch = html.match(/Rating[^0-9]+([\d.]+)/i);
  const rating = ratingMatch ? ratingMatch[1] : null;
  const genreMatches = [...html.matchAll(/\/genres\/[^"]+">([^<]+)<\/a>/g)].map(m => m[1]);
  const genres = genreMatches.length ? genreMatches : null;
  const episodeLinks = [];
  const epRegex = /<a[^>]+href="(https:\/\/otakudesu\.blog\/episode\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let epMatch;
  while ((epMatch = epRegex.exec(html)) !== null) {
    const epUrl = epMatch[1];
    const epTitle = decodeHtml(stripTags(epMatch[2]));
    if (epTitle && !episodeLinks.find(e => e.url === epUrl)) {
      episodeLinks.push({ title: epTitle, url: epUrl });
    }
  }
  return { title, url, rating, genres, episodeLinks };
}

function parseEpisodePage(html, url) {
  const videoUrls = [];
  const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
  let match;
  while ((match = iframeRegex.exec(html)) !== null) {
    const src = match[1];
    if (src && !src.includes('disqus') && !src.includes('facebook') && !src.includes('google')) {
      videoUrls.push(src);
    }
  }
  const mirrorRegex = /href="(https?:\/\/[^"]+\.(?:mp4|mkv|m3u8)[^"]*)"/gi;
  while ((match = mirrorRegex.exec(html)) !== null) {
    videoUrls.push(match[1]);
  }
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? decodeHtml(stripTags(titleMatch[1])) : null;
  return { title, url, videoUrls: [...new Set(videoUrls)] };
}

async function searchAnime(query) {
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=anime`;
  const html = await fetchPage(searchUrl);
  return parseSearchResults(html);
}

async function getAnimeDetail(animeUrl) {
  const html = await fetchPage(animeUrl);
  return parseDetailPage(html, animeUrl);
}

async function getEpisodeVideos(episodeUrl) {
  const html = await fetchPage(episodeUrl);
  return parseEpisodePage(html, episodeUrl);
}

module.exports = (app) => {
  
  // SEARCH
  app.get('/anime/otakudesu/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ status: false, error: 'Parameter q wajib diisi' });
      const results = await searchAnime(q);
      res.json({ status: true, creator: 'AxlyDev', data: { keyword: q, totalResults: results.length, results } });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
  
  // DETAIL
  app.get('/anime/otakudesu/detail', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi' });
      const result = await getAnimeDetail(url);
      res.json({ status: true, creator: 'AxlyDev', data: result });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
  
  // STREAM
  app.get('/anime/otakudesu/stream', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi' });
      const result = await getEpisodeVideos(url);
      res.json({ status: true, creator: 'AxlyDev', data: result });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
};
