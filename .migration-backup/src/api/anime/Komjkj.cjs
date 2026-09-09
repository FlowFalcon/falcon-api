const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  const baseUrl = 'https://www.maid.my.id';
  const apiBase = 'https://flowfalcon.dpdns.org/anime/doujin';

  async function fetchHtml(url) {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: baseUrl
      }
    });
    return cheerio.load(data);
  }

  // 🔍 Search Manga
  app.get('/anime/doujin/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ status: false, message: 'Parameter q wajib diisi.' });

    try {
      const $ = await fetchHtml(`${baseUrl}/?s=${encodeURIComponent(q)}`);
      const result = [];

      $('.flexbox2-item').each((_, el) => {
        const title = $(el).find('.flexbox2-title .title').text().trim();
        const url = $(el).find('a').attr('href');
        const thumbnail = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
        const type = $(el).find('.type').text().trim();
        const score = $(el).find('.score').text().trim();

        result.push({ title, thumbnail, type, score, detail_api: `${apiBase}/detail?url=${encodeURIComponent(url)}` });
      });

      res.json({ status: true, creator: "AxlyChann", result });
    } catch (e) {
      res.status(500).json({ status: false, message: e.message });
    }
  });

  // 📖 Detail Manga
app.get('/anime/doujin/detail', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: 'Parameter url wajib diisi.' });

    try {
        const $ = await fetchHtml(url);
        const title = $('.series-titlex h2').text().trim();
        const type = $('.series-infoz .type').text().trim();
        const statusText = $('.series-infoz .status').text().trim();
        const cover = $('.series-thumb img').attr('data-src') || $('.series-thumb img').attr('src');
        const synopsis = $('.series-synops p').text().trim();

        const info = {
            published: $('.series-infolist li:contains("Published") span').text().trim(),
            author: $('.series-infolist li:contains("Author") span').text().trim(),
            totalChapter: $('.series-infolist li:contains("Total Chapter") span.chapter').text().trim()
        };

        const genres = [];
        $('.series-genres a').each((_, el) => genres.push($(el).text().trim()));

        const chapters = [];
        $('.series-chapterlist li').each((_, el) => {
            const aTag = $(el).find('.flexch-infoz a');
            const chapterLink = aTag.attr('href');

            const chapterSpan = aTag.find('span').first().clone();
            chapterSpan.find('.date').remove();
            const chapterTitle = chapterSpan.text().trim();

            const date = aTag.find('.date').text().trim();

            chapters.push({
                title: chapterTitle,
                date,
                chapter_api: `${apiBase}/chapter?url=${encodeURIComponent(chapterLink)}`,
                download_api: `${apiBase}/download?url=${encodeURIComponent(chapterLink)}`
            });
        });

        res.json({
            status: true,
            creator: "AxlyChann",
            result: { title, type, status: statusText, cover, synopsis, info, genres, chapters }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});


  // 🖼️ Ambil Gambar Chapter
  app.get('/anime/doujin/chapter', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: 'Parameter url wajib diisi.' });

    try {
      const $ = await fetchHtml(url);
      const title = $('.entry-title').text().trim();
      const images = [];

      $('.reader-area img').each((_, el) => {
        const img = $(el).attr('src') || $(el).attr('data-src');
        if (img && !img.includes('logo')) images.push(img);
      });

      res.json({ status: true, creator: "AxlyChann", result: { title, images } });
    } catch (e) {
      res.status(500).json({ status: false, message: e.message });
    }
  });

  // 📄 Download Chapter PDF
  app.get('/anime/doujin/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: 'Parameter url wajib diisi.' });

    try {
      const cheerio = require('cheerio');
      const PDFDocument = require('pdfkit');
      const { data } = await axios.get(url, { headers: { Referer: baseUrl } });
      const $ = cheerio.load(data);

      const title = $('.entry-title').text().trim() || 'chapter';
      const images = [];

      $('.reader-area img').each((_, el) => {
        const img = $(el).attr('src') || $(el).attr('data-src');
        if (img && !img.includes('logo')) images.push(img);
      });

      if (!images.length) return res.status(404).json({ status: false, message: 'Tidak ada gambar ditemukan.' });

      const doc = new PDFDocument({ autoFirstPage: false });
      const chunks = [];

      for (let imgUrl of images) {
        const { data: imgBuffer } = await axios.get(imgUrl, {
          responseType: 'arraybuffer',
          headers: {
            Referer: baseUrl,
            'User-Agent': 'Mozilla/5.0'
          }
        });
        const image = doc.openImage(imgBuffer);
        doc.addPage({ size: [image.width, image.height] });
        doc.image(imgBuffer, 0, 0, { width: image.width, height: image.height });
      }

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdf = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
        res.send(pdf);
      });
      doc.end();
    } catch (e) {
      res.status(500).json({ status: false, message: e.message });
    }
  });
};
