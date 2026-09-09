const { fetchSite, mapUpstreamError } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://donghub.vip";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {

  app.get('/donghua/servers', async (req, res) => {
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

      // Cari select mirror
      const servers = [];
      const $select = $('select.mirror');

      if ($select.length === 0) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Tidak ditemukan pilihan server',
          note: 'Mungkin halaman ini tidak memiliki multiple server'
        });
      }

      // Ambil semua option
      $select.find('option').each((_, el) => {
        const $option = $(el);
        const value = $option.attr('value');
        const label = $option.text().trim();
        const index = $option.attr('data-index') || null;
        const isSelected = $option.prop('selected') || false;

        if (value && value !== '' && label !== 'Pilih Server Video') {
          // Decode base64
          let decodedHtml = '';
          let embedUrl = null;
          let platform = 'Unknown';
          let isAds = false;

          try {
            decodedHtml = Buffer.from(value, 'base64').toString('utf-8');
          } catch {
            decodedHtml = value;
          }

          // Extract src dari iframe
          const srcMatch = decodedHtml.match(/src=["']([^"']+)["']/);
          if (srcMatch) {
            embedUrl = srcMatch[1];
          }

          // Coba ambil URL langsung dari decoded
          if (!embedUrl) {
            const urlMatch = decodedHtml.match(/https?:\/\/[^\s"']+/);
            if (urlMatch) {
              embedUrl = urlMatch[0];
            }
          }

          // Detect platform
          if (embedUrl) {
            if (embedUrl.includes('ok.ru')) platform = 'OK.ru';
            else if (embedUrl.includes('dailymotion') || embedUrl.includes('player.cakrawalaweb.site')) platform = 'Dailymotion';
            else if (embedUrl.includes('rumble')) platform = 'Rumble';
            else if (embedUrl.includes('play.d.tube') || embedUrl.includes('d.tube')) platform = 'D-Tube';
            else if (embedUrl.includes('youtube') || embedUrl.includes('youtu.be')) platform = 'YouTube';
            else if (embedUrl.includes('abyssplayer')) platform = 'Abyssplayer';
            else if (embedUrl.includes('rpmvid')) platform = 'RPMShare';
            else if (embedUrl.includes('rubyvidhub')) platform = 'Streamruby';
            else if (embedUrl.includes('playmogo')) platform = 'Doods';
            else if (embedUrl.includes('morencius')) platform = 'Vidhide';
            else if (embedUrl.includes('turbovidhls')) platform = 'TurboVIP';
          }

          // Cek apakah ada [ADS] di label
          if (label.includes('[ADS]')) {
            isAds = true;
          }

          // Extract video ID dari URL
          let videoId = null;
          if (embedUrl) {
            // OK.ru
            const okMatch = embedUrl.match(/videoembed\/(\d+)/);
            if (okMatch) videoId = okMatch[1];

            // Dailymotion
            const dmMatch = embedUrl.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
            if (dmMatch) videoId = dmMatch[1];

            // YouTube
            const ytMatch = embedUrl.match(/v=([a-zA-Z0-9_-]+)/);
            if (ytMatch) videoId = ytMatch[1];

            // Abyssplayer
            const abyssMatch = embedUrl.match(/abyssplayer\.com\/([a-zA-Z0-9_]+)/);
            if (abyssMatch) videoId = abyssMatch[1];

            // D-Tube (?v=UUID)
            const dtMatch = embedUrl.match(/[?&]v=([a-zA-Z0-9-]+)/);
            if (dtMatch) videoId = dtMatch[1];
          }

          servers.push({
            label: label.replace('[ADS]', '').trim(),
            original_label: label,
            index: index,
            value: value,
            decoded_html: decodedHtml,
            embed_url: embedUrl,
            platform: platform,
            is_ads: isAds,
            is_selected: isSelected,
            video_id: videoId
          });
        }
      });

      if (servers.length === 0) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Tidak ditemukan server yang valid'
        });
      }

      // Ambil judul episode
      const title = $('.entry-title').text().trim() || 'Donghua Episode';

      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          slug: slug,
          total_servers: servers.length,
          servers: servers,
          // Rekomendasi: server pertama yang bukan ADS
          recommended: servers.find(s => !s.is_ads) || servers[0] || null
        }
      });

    } catch (error) {
      console.error('[Donghua Servers Error]', error.message);
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
