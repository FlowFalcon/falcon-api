const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/donghua/ongoing', async (req, res) => {
    try {
      let allResults = [];
      let currentPage = 1;
      let hasNext = true;
      
      // Loop sampai ga ada halaman next
      while (hasNext) {
        const url = `${BASE_URL}/ongoing/page/${currentPage}/`;
        console.log(`[Ongoing] Scraping page ${currentPage}...`);
        
        const { data } = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(data);
        
        // Parse hasil di halaman ini
        $('.listupd .bs').each((_, el) => {
          const link = $(el).find('.bsx a').attr('href') || "";
          const title = $(el).find('.tt').text().trim() || "";
          const type = $(el).find('.typez').text().trim() || "";
          const status = $(el).find('.epx').text().trim() || "";
          const sub = $(el).find('.sb').text().trim() || "";
          const thumbnail = $(el).find('img').attr('src') || null;
          
          if (title && link) {
            const slug = link.replace(/^\//, '').replace(/\/$/, '');
            allResults.push({
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
        
        // Cek apakah ada halaman selanjutnya
        hasNext = $('.next.page-numbers').length > 0;
        currentPage++;
        
        // Safety break (max 50 pages)
        if (currentPage > 50) break;
      }
      
      // Hapus duplikat (jika ada)
      const uniqueResults = [];
      const seenUrls = new Set();
      for (const item of allResults) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          uniqueResults.push(item);
        }
      }
      
      res.json({
        status: true,
        creator: getCreator(),
        total: uniqueResults.length,
        results: uniqueResults
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
