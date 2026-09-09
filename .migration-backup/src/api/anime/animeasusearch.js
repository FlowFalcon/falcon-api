const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://v1.animasu.work";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/anime/animasu/search', async (req, res) => {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          status: false,
          creator: getCreator(),
          error: 'Parameter "q" (query) wajib diisi (contoh: ?q=one+punch+man)'
        });
      }

      // ─── Ambil Halaman 1 ──────────────────────────────────
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
      const { data } = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': BASE_URL,
          'Cookie': 'cf_clearance=1; _ga=1; _ym_uid=1; _ym_d=1; _ym_isad=1'
        },
        timeout: 30000,
        maxRedirects: 5
      });

      const $ = cheerio.load(data);
      const results = [];
      let currentPage = 1;
      let nextPage = null;
      let totalPages = 1;

      // ─── Ambil Hasil ──────────────────────────────────────
      $('.listupd .bs, .listupd article.bs, .search-results .bs, .results .bs, .bixbox .bs').each((_, el) => {
        const $el = $(el);
        
        const $link = $el.find('.bsx a, a[itemprop="url"]');
        const href = $link.attr('href');
        const title = $link.attr('title') || $link.find('h2').text().trim() || $link.text().trim() || 'Unknown';
        
        const $img = $el.find('img');
        const image = $img.attr('src') || $img.attr('data-src') || null;
        
        const episodeText = $el.find('.bt .epx, .epx').text().trim() || $el.find('.episode').text().trim() || '';
        const episode = episodeText.replace(/[^0-9]/g, '') || null;
        
        const subStatus = $el.find('.bt .sb, .sub-status').text().trim() || 'Sub';
        const type = $el.find('.typez, .type').text().trim() || 'Anime';
        const status = $el.find('.status, .ongoing').text().trim() || null;
        const rating = $el.find('.rating, .score').text().trim() || null;

        let slug = null;
        if (href) {
          const slugMatch = href.match(/\/([^\/]+)\/?$/);
          if (slugMatch) slug = slugMatch[1];
        }

        if (href && title) {
          results.push({
            title: title,
            slug: slug,
            url: href,
            image: image,
            episode: episode,
            type: type,
            sub_status: subStatus,
            status: status,
            rating: rating,
            source: 'Animasu'
          });
        }
      });

      // ─── Ambil Info Paginasi ─────────────────────────────
      // Current page
      const $current = $('.page-numbers.current, .current');
      if ($current.length > 0) {
        const currentText = $current.text().trim();
        if (currentText && !isNaN(currentText)) {
          currentPage = parseInt(currentText);
        }
      }

      // Total pages & next page dari pagination
      const $pagination = $('.pagination, .page-numbers, .navigation');
      let maxPage = currentPage;

      $pagination.find('a.page-numbers, a.page').each((_, el) => {
        const text = $(el).text().trim();
        if (text && !isNaN(text)) {
          const num = parseInt(text);
          if (num > maxPage) maxPage = num;
        }
      });

      // Cek halaman terakhir (last)
      $pagination.find('a:contains("Last"), a:contains("Terakhir")').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const match = href.match(/page\/(\d+)/);
          if (match) {
            const last = parseInt(match[1]);
            if (last > maxPage) maxPage = last;
          }
        }
      });

      totalPages = maxPage;

      // Next page
      const $next = $('.next, .nav-next, a.next');
      if ($next.length > 0) {
        const nextHref = $next.attr('href');
        if (nextHref) {
          const nextPageMatch = nextHref.match(/page\/(\d+)/);
          if (nextPageMatch) nextPage = parseInt(nextPageMatch[1]);
        }
      }

      // ─── Cek Jika Tidak Ada Hasil ─────────────────────────
      if (results.length === 0) {
        const noResult = $('.no-results, .search-no-results').length > 0 ||
                         $('h2:contains("Tidak ada hasil")').length > 0;

        if (noResult) {
          return res.status(404).json({
            status: false,
            creator: getCreator(),
            error: 'Tidak ditemukan hasil untuk "' + q + '"',
            query: q
          });
        }

        // Fallback
        $('.bixbox .bs, .listupd .bs, .releases .bs').each((_, el) => {
          const $el = $(el);
          const $link = $el.find('a');
          const href = $link.attr('href');
          const title = $link.attr('title') || $link.find('h2').text().trim() || $link.text().trim();
          
          if (href && title && !results.some(r => r.url === href)) {
            results.push({
              title: title,
              url: href,
              image: $el.find('img').attr('src') || null,
              source: 'Animasu'
            });
          }
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Tidak ditemukan hasil untuk "' + q + '"',
          query: q
        });
      }

      // ─── Response ──────────────────────────────────────────
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          query: q,
          page: currentPage,
          total_pages: totalPages,
          has_next_page: nextPage !== null,
          next_page: nextPage,
          total_results: results.length,
          results: results
        }
      });

    } catch (error) {
      console.error('[Animasu Search Error]', error.message);
      
      if (error.response?.status === 403 || error.response?.status === 503) {
        return res.status(503).json({
          status: false,
          creator: getCreator(),
          error: 'Animasu sedang dalam perlindungan Cloudflare atau maintenance',
          note: 'Coba lagi nanti atau gunakan sumber lain (Samehadaku / Animekuindo)'
        });
      }

      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
