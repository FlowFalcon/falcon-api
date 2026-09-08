const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://v1.animasu.work";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/anime/animasu/detail', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          creator: getCreator(),
          error: 'Parameter "url" wajib diisi (URL halaman anime)'
        });
      }

      if (!url.includes('animasu.work')) {
        return res.status(400).json({
          status: false,
          creator: getCreator(),
          error: 'URL harus dari domain animasu.work'
        });
      }

      // Fetch HTML
      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Referer': BASE_URL,
          'Cookie': 'cf_clearance=1; _ga=1; _ym_uid=1; _ym_d=1; _ym_isad=1'
        },
        timeout: 30000
      });

      const $ = cheerio.load(html);

      // ─── Ambil Data dari .bigcontent ─────────────────────
      const $bigcontent = $('.bigcontent');

      // ─── Thumbnail ──────────────────────────────────────
      const thumbnail = $bigcontent.find('.thumb img').attr('src') || null;

      // ─── Judul ──────────────────────────────────────────
      const title = $bigcontent.find('.infox h1').text().trim() || 
                    $('h1.entry-title').text().trim() || 
                    'Unknown';

      // ─── Judul Alternatif ──────────────────────────────
      const altTitle = $bigcontent.find('.infox .alter').text().trim() || null;

      // ─── Sinopsis ──────────────────────────────────────
      const synopsis = $bigcontent.find('.infox .sepele').text().trim() || null;

      // ─── Genre ──────────────────────────────────────────
      const genres = [];
      $bigcontent.find('.infox .spe span:has(b:contains("Genre:")) a').each((_, el) => {
        genres.push({
          name: $(el).text().trim(),
          url: $(el).attr('href') || null
        });
      });

      // ─── Status ──────────────────────────────────────────
      let status = null;
      const statusText = $bigcontent.find('.infox .spe span:has(b:contains("Status:"))').text().trim();
      const statusMatch = statusText.match(/Status:\s*(.+?)(?:\s*$|🔥)/);
      if (statusMatch) status = statusMatch[1].trim();

      // ─── Rilis ──────────────────────────────────────────
      let releaseDate = null;
      const rilisText = $bigcontent.find('.infox .spe span:has(b:contains("Rilis:"))').text().trim();
      const rilisMatch = rilisText.match(/Rilis:\s*(.+)/);
      if (rilisMatch) releaseDate = rilisMatch[1].trim();

      // ─── Jenis ──────────────────────────────────────────
      let type = null;
      const typeText = $bigcontent.find('.infox .spe span:has(b:contains("Jenis:"))').text().trim();
      const typeMatch = typeText.match(/Jenis:\s*(.+)/);
      if (typeMatch) type = typeMatch[1].trim();

      // ─── Durasi ──────────────────────────────────────────
      let duration = null;
      const durText = $bigcontent.find('.infox .spe span:has(b:contains("Durasi:"))').text().trim();
      const durMatch = durText.match(/Durasi:\s*(.+)/);
      if (durMatch) duration = durMatch[1].trim();

      // ─── Studio ──────────────────────────────────────────
      const studios = [];
      $bigcontent.find('.infox .spe span:has(b:contains("Studio:")) a').each((_, el) => {
        studios.push({
          name: $(el).text().trim(),
          url: $(el).attr('href') || null
        });
      });

      // ─── Musim ──────────────────────────────────────────
      let season = null;
      const seasonText = $bigcontent.find('.infox .spe span:has(b:contains("Musim:"))').text().trim();
      const seasonMatch = seasonText.match(/Musim:\s*(.+)/);
      if (seasonMatch) season = seasonMatch[1].trim();

      // ─── Diposting ──────────────────────────────────────
      let postedBy = null;
      const postedText = $bigcontent.find('.infox .spe span:has(b:contains("Diposting:"))').text().trim();
      const postedMatch = postedText.match(/Diposting:\s*(.+)/);
      if (postedMatch) postedBy = postedMatch[1].trim();

      // ─── Diupdate ──────────────────────────────────────
      let updatedAt = null;
      const updateText = $bigcontent.find('.infox .spe span:has(b:contains("Diupdate:"))').text().trim();
      const updateMatch = updateText.match(/Diupdate:\s*(.+)/);
      if (updateMatch) updatedAt = updateMatch[1].trim();

      // ─── Rating ──────────────────────────────────────────
      let rating = null;
      const ratingText = $bigcontent.find('.rt .rating strong').text().trim();
      const ratingMatch = ratingText.match(/Rating\s*([\d.]+)/);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);

      // ─── Disimpan oleh ──────────────────────────────────
      let savedBy = null;
      const savedText = $bigcontent.find('.rt .bmc').text().trim();
      const savedMatch = savedText.match(/Disimpan oleh\s*(\d+)/);
      if (savedMatch) savedBy = parseInt(savedMatch[1]);

      // ─── Link Serial/OVA/Movie ──────────────────────────
      let serialLink = null;
      $bigcontent.find('.infox .spe a:has(u:contains("Cek Serial/OVA/Movienya"))').each((_, el) => {
        serialLink = $(el).attr('href') || null;
      });

      // ─── Response ──────────────────────────────────────────
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          alt_title: altTitle,
          thumbnail: thumbnail,
          synopsis: synopsis,
          genres: genres.length > 0 ? genres : null,
          status: status,
          release_date: releaseDate,
          type: type,
          duration: duration,
          studios: studios.length > 0 ? studios : null,
          season: season,
          posted_by: postedBy,
          updated_at: updatedAt,
          rating: rating,
          saved_by: savedBy,
          serial_link: serialLink,
          url: url
        }
      });

    } catch (error) {
      console.error('[Animasu Detail Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
