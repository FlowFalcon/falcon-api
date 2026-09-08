const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {

  app.get('/donghua/search', async (req, res) => {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "q" diperlukan (contoh: ?q=renegade+immortal)'
      });
    }

    try {
      // anichin.cafe search endpoint: ?s=... (root atau /page/N/)
      // Page 2+ jarang return 200 → cukup 1 page fetch, simpan 1 request.
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
      console.log(`[Search] Scraping "${q}"...`);

      const { data } = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000
      });

      const $ = cheerio.load(data);

      const seen = new Set();
      const results = [];

      $('.listupd article.bs').each((_, el) => {
        const $el = $(el);
        const $a = $el.find('.bsx a').first();
        const link = $a.attr('href') || "";
        const title = $el.find('.tt').text().trim() || "";
        if (!title || !link) return;

        const type = $el.find('.typez').text().trim() || null;
        const status = $el.find('.status').text().trim()
                    || $el.find('.epx').text().trim()
                    || null;
        const sub = $el.find('.sb').text().trim() || null;
        const thumbnail = $el.find('img').attr('src') || $el.find('img').attr('data-src') || null;

        const url = link.startsWith('http') ? link : `${BASE_URL}${link}`;
        if (seen.has(url)) return;
        seen.add(url);

        // slug = path tanpa leading/trailing slash
        const slug = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/|\/$/g, '');

        results.push({
          title: title,
          slug: slug,
          url: url,
          type: type,           // Donghua / Movie
          status: status,       // Ongoing / Completed
          sub: sub,             // Sub / Sub Indo
          thumbnail: thumbnail
        });
      });

      res.json({
        status: true,
        creator: getCreator(),
        query: q,
        total: results.length,
        results: results
      });

    } catch (error) {
      console.error('[Search Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
