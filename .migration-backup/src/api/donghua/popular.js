const { fetchSite, mapUpstreamError } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://donghub.vip";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {

  app.get('/donghua/popular', async (req, res) => {
    try {
      // Ambil halaman utama donghub
      const data = await fetchSite(BASE_URL);

      const $ = cheerio.load(data);

      // Cari section "Terpopuler Hari Ini"
      const popularList = [];

      // Cari div .popularslider .popconslide .bs
      $('.popularslider .popconslide .bs').each((_, el) => {
        const $el = $(el);

        // Ambil link dan judul
        const $link = $el.find('.bsx a');
        const href = $link.attr('href');
        const title = $link.attr('title') || $el.find('.tt h2').text().trim() || $el.find('.tt').text().trim() || 'Unknown';

        // Ambil judul pendek (dari .tt)
        const shortTitle = $el.find('.tt').contents().first().text().trim() || title;

        // Ambil gambar
        const $img = $el.find('img.ts-post-image');
        const image = $img.attr('src') || $img.attr('data-src') || null;
        const imageAlt = $img.attr('alt') || title;

        // Ambil episode
        const episodeText = $el.find('.bt .epx').text().trim() || '';
        const episode = episodeText.replace('Ep', '').trim() || null;

        // Ambil status subtitle
        const subStatus = $el.find('.bt .sb').text().trim() || 'Sub';

        // Ambil tipe (Donghua/Anime)
        const type = $el.find('.typez').text().trim() || 'Donghua';

        // Cek apakah ada badge hot
        const isHot = $el.find('.hotbadge').length > 0;

        // Ambil slug dari href
        const slug = href ? href.replace(/^https?:\/\/[^/]+/, '').replace(/^\/|\/$/g, '') : null;

        // Ambil rel (ID)
        const rel = $link.attr('rel') || null;

        popularList.push({
          title: title,
          short_title: shortTitle,
          slug: slug,
          url: href && href.startsWith('http') ? href : (href ? `${BASE_URL}${href}` : null),
          episode: episode,
          type: type,
          sub_status: subStatus,
          is_hot: isHot,
          image: image,
          image_alt: imageAlt,
          rel: rel
        });
      });

      if (popularList.length === 0) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Tidak ditemukan data terpopuler',
          note: 'Mungkin struktur website berubah'
        });
      }

      // Ambil judul section
      const sectionTitle = $('.releases.hothome h2').text().trim() || 'Terpopuler Hari Ini';

      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: sectionTitle,
          total: popularList.length,
          source: BASE_URL,
          list: popularList
        }
      });

    } catch (error) {
      console.error('[Donghua Popular Error]', error.message);
      const mapped = mapUpstreamError(error);
      res.status(mapped.code).json({
        status: false,
        creator: getCreator(),
        ...mapped.body
      });
    }
  });
};
