const { fetchSite } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/donghua/upcoming', async (req, res) => {
    try {
      const url = `${BASE_URL}/upcoming-donghua/`;
      const data = await fetchSite(url);
      
      const $ = cheerio.load(data);
      const results = [];

      // NOTE 2026-09-08: /upcoming-donghua/ di anichin.moe sudah mati —
      // server return 200 tapi isinya homepage (soft-404, 0 item body).
      // Selector di bawah tetap jalan bila kategori dihidupkan lagi.
      // Sementara itu pakai /donghua/schedule untuk jadwal rilis.
      
      // Parse daftar upcoming donghua
      $('.listupd .bs').each((_, el) => {
        const link = $(el).find('.bsx a').attr('href') || "";
        const title = $(el).find('.tt').text().trim() || "";
        const type = $(el).find('.typez').text().trim() || "";
        const status = $(el).find('.epx').text().trim() || "";
        const sub = $(el).find('.sb').text().trim() || "";
        const thumbnail = $(el).find('img').attr('src') || null;
        
        if (title && link) {
          const slug = link.replace(/^\//, '').replace(/\/$/, '');
          results.push({
            title: title,
            slug: slug,
            url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
            type: type,
            status: status,
            sub: sub,
            thumbnail: thumbnail
          });
        }
      });
      
      res.json({
        status: true,
        creator: getCreator(),
        total: results.length,
        results: results,
        note: results.length === 0 ? 'Kategori upcoming mati di sumber (anichin). Pakai /donghua/schedule untuk jadwal rilis.' : undefined
      });
      
    } catch (error) {
      console.error('[Upcoming Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
