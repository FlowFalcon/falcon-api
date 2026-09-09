const { fetchSite, mapUpstreamError } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://donghub.vip";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {

  app.get('/donghua/download', async (req, res) => {
    const { slug } = req.query;

    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "slug" diperlukan (contoh: ?slug=renegade-immortal-episode-148-subtitle-indonesia)'
      });
    }

    try {
      // Ambil halaman episode dari donghub
      const data = await fetchSite(`${BASE_URL}/${slug}/`);

      const $ = cheerio.load(data);

      // Cari div .mctnx .soraddlx
      const downloadLinks = [];
      const $container = $('.mctnx .soraddlx');

      if ($container.length === 0) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Tidak ditemukan link download',
          note: 'Sumber (donghub) saat ini tidak menyediakan box download di halaman episode'
        });
      }

      // Ambil judul
      const title = $container.find('.sorattlx h3').text().trim() ||
                    $('.entry-title').text().trim() ||
                    'Donghua Episode';

      // Ambil semua kualitas
      $container.find('.soraurlx').each((_, el) => {
        const $el = $(el);

        // Ambil kualitas (360p, 480p, 720p, 1080p, 4K)
        const quality = $el.find('strong').text().trim();

        // Ambil semua link
        const links = [];
        $el.find('a').each((_, a) => {
          const $a = $(a);
          const href = $a.attr('href');
          const label = $a.text().trim();

          if (href && href !== '#') {
            // Detect platform
            let platform = 'Unknown';
            if (href.includes('bit.ly')) platform = 'Mirrored';
            else if (href.includes('pndk.to') || href.includes('pixeldrain')) platform = 'Pixeldrain';
            else if (href.includes('terabox')) platform = 'Terabox';
            else if (href.includes('mega.nz')) platform = 'Mega';
            else if (href.includes('gdrive') || href.includes('drive.google')) platform = 'Google Drive';
            else if (href.includes('mediafire')) platform = 'MediaFire';
            else if (href.includes('zippyshare')) platform = 'ZippyShare';

            links.push({
              label: label,
              platform: platform,
              url: href
            });
          }
        });

        if (quality && links.length > 0) {
          downloadLinks.push({
            quality: quality,
            links: links
          });
        }
      });

      if (downloadLinks.length === 0) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Tidak ditemukan link download yang valid'
        });
      }

      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          slug: slug,
          total_qualities: downloadLinks.length,
          downloads: downloadLinks
        }
      });

    } catch (error) {
      console.error('[Donghua Download Error]', error.message);
      const mapped = mapUpstreamError(error);
      if (mapped.code === 404) {
        mapped.body.note = mapped.body.note || 'Periksa kembali slug episode';
      }
      return res.status(mapped.code).json({
        status: false,
        creator: getCreator(),
        ...mapped.body
      });
    }
  });
};
