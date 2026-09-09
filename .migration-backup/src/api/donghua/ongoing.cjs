const { fetchSite } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://donghub.vip";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

function parseCards($) {
  const results = [];
  const seen = new Set();
  $('.listupd .bs').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('.bsx a').first();
    const link = $a.attr('href') || "";
    const $tt = $el.find('.tt').first();
    const title = $tt.clone().children().remove().end().text().trim()
      || $a.attr('title') || "";
    if (!title || !link) return;
    const type = $el.find('.typez').first().text().trim() || "";
    const status = $el.find('.epx').first().text().trim()
      || $el.find('.status').first().text().trim() || "";
    const sub = $el.find('.sb').first().text().trim() || "";
    const thumbnail = $el.find('img').attr('src') || $el.find('img').attr('data-src') || null;
    const full = link.startsWith('http') ? link : `${BASE_URL}${link}`;
    if (seen.has(full)) return;
    seen.add(full);
    results.push({
      title: title,
      slug: full.replace(/^https?:\/\/[^/]+/, '').replace(/^\/|\/$/g, ''),
      url: full,
      type: type,
      status: status,
      sub: sub,
      thumbnail: thumbnail
    });
  });
  return results;
}

module.exports = (app) => {

  // donghub tidak punya /ongoing/ — pakai arsip filter. 1 halaman per hit (?page=N).
  app.get('/donghua/ongoing', async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      if (page > 50) {
        return res.status(400).json({
          status: false,
          creator: getCreator(),
          error: 'Parameter "page" maksimal 50'
        });
      }

      const url = page <= 1
        ? `${BASE_URL}/anime/?status=ongoing&order=update`
        : `${BASE_URL}/anime/page/${page}/?status=ongoing&order=update`;
      console.log(`[Ongoing] Scraping page ${page}...`);

      const data = await fetchSite(url);
      const $ = cheerio.load(data);
      const results = parseCards($);

      res.json({
        status: true,
        creator: getCreator(),
        page: page,
        has_next: $('.pagination .next, .next.page-numbers, a.next').length > 0,
        total: results.length,
        results: results
      });

    } catch (error) {
      console.error('[Ongoing Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
