const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  const baseUrl = 'https://alqanime.net/';
  const apiBase = 'https://flowfalcon.dpdns.org/anime/alqanime';

  const resolveImage = (img) => img?.startsWith('data:') ? null : img?.trim();

  // ======================
  // === MAIN SCRAPER ====
  // ======================
  async function fetchHtml(url) {
    const { data } = await axios.get(url);
    return cheerio.load(data);
  }

  // 🔥 Lagi Hangat
  app.get('/anime/alqanime/hangat', async (req, res) => {
    try {
      const $ = await fetchHtml(baseUrl);
      const result = [];

      $('.listupd article.bs').each((_, el) => {
        const title = $(el).find('.tt .ntitle').text().trim();
        const link = $(el).find('a').attr('href');
        const image = $(el).find('img').attr('data-src');
        const type = $(el).find('.typez').text().trim();
        const episode = $(el).find('.epx').text().trim();

        result.push({ title, link, image, type, episode, url_api: `${apiBase}/detail?url=${encodeURIComponent(link)}` });
      });

      res.json({ status: true, creator: "AxlyChann", result });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // 🆕 Rilisan Terbaru
  app.get('/anime/alqanime/rilisan', async (req, res) => {
    try {
      const $ = await fetchHtml(baseUrl);
      const result = [];

      $('.listupd .bs.styleegg').each((_, el) => {
        const title = $(el).find('.eggtitle').text().trim();
        const link = $(el).find('a').attr('href');
        const image = $(el).find('img').attr('data-src');
        const type = $(el).find('.eggtype').text().trim();
        const episode = $(el).find('.eggepisode').text().trim();

        result.push({ title, link, image, type, episode, url_api: `${apiBase}/detail?url=${encodeURIComponent(link)}` });
      });

      res.json({ status: true, creator: "AxlyChann", result });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // ✅ Selesai Tayang
  app.get('/anime/alqanime/selesai', async (req, res) => {
    try {
      const $ = await fetchHtml(baseUrl);
      const result = [];

      $('.bixbox').eq(2).find('.listupd .bs.styletere').each((_, el) => {
        const title = $(el).find('.ntitle').text().trim();
        const link = $(el).find('a').attr('href');
        const image = $(el).find('img').attr('data-src');
        const type = $(el).find('.typez').text().trim();

        result.push({ title, link, image, type, url_api: `${apiBase}/detail?url=${encodeURIComponent(link)}` });
      });

      res.json({ status: true, creator: "AxlyChann", result });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // 🎬 Movie
  app.get('/anime/alqanime/movie', async (req, res) => {
    try {
      const $ = await fetchHtml(baseUrl);
      const result = [];

      $('.bixbox').eq(3).find('.listupd .bs.styletere').each((_, el) => {
        const title = $(el).find('.ntitle').text().trim();
        const link = $(el).find('a').attr('href');
        const image = $(el).find('img').attr('data-src');
        const type = $(el).find('.typez').text().trim();

        result.push({ title, link, image, type, url_api: `${apiBase}/detail?url=${encodeURIComponent(link)}` });
      });

      res.json({ status: true, creator: "AxlyChann", result });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // ⭐ Populer Mingguan
  app.get('/anime/alqanime/populer', async (req, res) => {
    try {
      const $ = await fetchHtml(baseUrl);
      const result = [];

      $('.serieslist.pop.wpop-weekly li').each((_, el) => {
        const title = $(el).find('h4 a').text().trim();
        const link = $(el).find('a').attr('href');
        const image = $(el).find('.imgseries img').attr('data-src');
        const genre = $(el).find('span b').parent().text().replace('Genre:', '').trim();

        result.push({ title, link, image, genre, url_api: `${apiBase}/detail?url=${encodeURIComponent(link)}` });
      });

      res.json({ status: true, creator: "AxlyChann", result });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // 📺 Ongoing
  app.get('/anime/alqanime/ongoing', async (req, res) => {
    try {
      const $ = await fetchHtml(baseUrl);
      const result = [];

      $('.ongoingseries ul li').each((_, el) => {
        const title = $(el).find('a .l').text().trim();
        const link = $(el).find('a').attr('href');
        const episode = $(el).find('a .r').text().trim();

        result.push({ title, link, episode, url_api: `${apiBase}/detail?url=${encodeURIComponent(link)}` });
      });

      res.json({ status: true, creator: "AxlyChann", result });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // 🔎 Search
  app.get('/anime/alqanime/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ status: false, message: 'Parameter q wajib' });

    try {
      const $ = await fetchHtml(`${baseUrl}?s=${encodeURIComponent(q)}`);
      const result = [];

      $('.listupd .bsx').each((_, el) => {
        const title = $(el).find('.ntitle').text().trim();
        const link = $(el).find('a').attr('href');
        const image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

        result.push({ title, link, image, url_api: `${apiBase}/detail?url=${encodeURIComponent(link)}` });
      });

      res.json({ status: true, creator: "AxlyChann", result });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // 📄 Detail
  app.get('/anime/alqanime/detail', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: 'Parameter url wajib' });

    try {
      const $ = await fetchHtml(url);
      const title = $('h1.entry-title').text().trim();
      const coverEl = $('.bigcover .ime img');
    let cover = coverEl.attr('data-src') || coverEl.attr('src') || '';
    cover = cover.startsWith('data:') ? null : cover.trim();

    const thumbEl = $('.thumbook .thumb img');
    let thumb = thumbEl.attr('data-src') || thumbEl.attr('src') || '';
    thumb = thumb.startsWith('data:') ? null : thumb.trim(); const synopsis = $('div.bixbox.synp div.entry-content').text().trim();

      const information = {};
      $('div.infox div.spe span').each((_, el) => {
        const key = $(el).find('b').text().replace(':', '').trim();
        const value = $(el).text().replace(`${key}:`, '').trim();
        if (key) information[key] = value;
      });

      const genres = [];
      $('div.genxed a').each((_, el) => genres.push($(el).text().trim()));

      const download_api = `${apiBase}/download?url=${encodeURIComponent(url)}`;

      res.json({
        status: true,
        creator: "AxlyChann",
        result: { title, thumb, cover, synopsis, information, genres, download_api }
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // ⬇️ Download
  app.get('/anime/alqanime/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: 'Parameter url wajib' });

    try {
      const $ = await fetchHtml(url);
      const downloadLinks = [];

      $('div.mctnx div.soraddl').each((_, el) => {
        const episode = $(el).find('h3').text().trim();
        const resolutions = [];

        $(el).find('div.soraurl').each((__, r) => {
          const resolution = $(r).find('.res').text().trim();
          const links = [];

          $(r).find('.slink a').each((___, l) => {
            links.push({ site: $(l).text().trim(), url: $(l).attr('href') });
          });

          resolutions.push({ resolution, links });
        });

        downloadLinks.push({ episode, resolutions });
      });

      res.json({ status: true, creator: "AxlyChann", result: downloadLinks });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });
};
