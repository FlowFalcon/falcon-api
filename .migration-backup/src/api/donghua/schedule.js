const { fetchSite } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://donghub.vip";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {

  app.get('/donghua/schedule', async (req, res) => {
    try {
      const data = await fetchSite(`${BASE_URL}/schedule/`);

      const $ = cheerio.load(data);
      const schedule = {};

      // donghub: .bixbox.schedulepage per hari, judul hari di .releases h3
      $('.bixbox.schedulepage').each((_, box) => {
        const $box = $(box);
        const day = $box.find('.releases h3').first().text().trim();
        if (!day) return;
        const animes = [];

        $box.find('.listupd .bs').each((_, el) => {
          const $a = $(el).find('.bsx a').first();
          const href = $a.attr('href') || "";
          const title = $a.attr('title') || $(el).find('.tt').first().text().trim() || "";
          if (!title || !href) return;
          animes.push({
            title: title,
            slug: href.replace(/^https?:\/\/[^/]+/, '').replace(/^\/|\/$/g, ''),
            url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
            time: $(el).find('.epx').first().text().trim() || null,
            episode: $(el).find('.sb').first().text().trim() || null,
            thumbnail: $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || null
          });
        });

        if (animes.length > 0) {
          schedule[day] = animes;
        }
      });

      res.json({
        status: true,
        creator: getCreator(),
        result: schedule
      });

    } catch (error) {
      console.error('[Schedule Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
