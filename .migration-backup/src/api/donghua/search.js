const { fetchSite } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://donghub.vip";

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
      // donghub search endpoint: ?s=... (WordPress standar, 1 page cukup)
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
      console.log(`[Search] Scraping "${q}"...`);

      const data = await fetchSite(searchUrl);

      const $ = cheerio.load(data);

      const seen = new Set();
      const results = [];

      $('.listupd article.bs, .listupd .bs').each((_, el) => {
        const $el = $(el);
        const $a = $el.find('.bsx a').first();
        const link = $a.attr('href') || "";
        const title = $a.attr('title')
          || $el.find('.tt').clone().children().remove().end().text().trim()
          || $el.find('.tt').text().trim() || "";
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
