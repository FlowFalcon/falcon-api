const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://v1.animasu.work";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/anime/animasu/stream', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          creator: getCreator(),
          error: 'Parameter "url" wajib diisi (URL episode Animasu)'
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

      // ─── Ambil Judul ──────────────────────────────────────
      const title = $('h1.entry-title').text().trim() || 
                    $('title').text().trim() || 
                    'Anime Episode';

      // ─── Ambil Thumbnail ──────────────────────────────────
      const thumbnail = $('meta[property="og:image"]').attr('content') ||
                        $('img[itemprop="image"]').attr('src') ||
                        null;

      // ─── Kumpulkan SEMUA iframe ──────────────────────────
      const streams = [];
      const allIframes = [];

      // Kumpulkan semua iframe dari berbagai selector
      $('#embed_holder iframe, .player-embed iframe, .video-content iframe').each((_, el) => {
        const $el = $(el);
        const src = $el.attr('src');
        if (src) allIframes.push({ src, el: $el });
      });

      // ─── DETECT & KLASIFIKASI ────────────────────────────
      for (const { src, el } of allIframes) {
        let slot = null;
        let platform = null;
        let embedId = null;
        let embedKey = null;
        let isResponsive = false;
        let width = el.attr('width') || null;
        let height = el.attr('height') || null;
        let loading = el.attr('loading') || null;
        let allowfullscreen = el.attr('allowfullscreen') !== undefined;
        let rawHtml = el.toString();
        let scrolling = el.attr('scrolling') || null;
        let marginwidth = el.attr('marginwidth') || null;
        let marginheight = el.attr('marginheight') || null;

        // ─── Slot 1: Blogger ──────────────────────────────
        if (src.includes('blogger.com/video.g')) {
          slot = 'blogger';
          platform = 'Blogger Video';
          const tokenMatch = src.match(/token=([^&]+)/);
          if (tokenMatch) embedId = tokenMatch[1];
          const originMatch = src.match(/origin=([^&]+)/);
          isResponsive = true;
        }

        // ─── Slot 2 & 5: VidHidePro ────────────────────────
        else if (src.includes('vidhidepro.com')) {
          slot = 'vidhidepro';
          platform = 'VidHidePro';
          const idMatch = src.match(/vidhidepro\.com\/v\/([a-zA-Z0-9]+)/);
          if (idMatch) embedId = idMatch[1];
          isResponsive = true;
          loading = loading || 'lazy';
        }

        // ─── Slot 2b: VidHideVip (mirror) ──────────────────
        else if (src.includes('vidhidevip.com')) {
          slot = 'vidhidevip';
          platform = 'VidHideVip';
          const idMatch = src.match(/vidhidevip\.com\/v\/([a-zA-Z0-9]+)/);
          if (idMatch) embedId = idMatch[1];
          isResponsive = true;
          loading = loading || 'lazy';
        }

        // ─── Slot 3: Mega.nz ──────────────────────────────
        else if (src.includes('mega.nz/embed')) {
          slot = 'mega';
          platform = 'Mega.nz';
          const match = src.match(/mega\.nz\/embed\/([^#]+)#([^\s&]+)/);
          if (match) {
            embedId = match[1];
            embedKey = match[2];
          }
          isResponsive = false;
        }

        // ─── Slot 4: Desustream ────────────────────────────
        else if (src.includes('desustream.info')) {
          slot = 'desustream';
          platform = 'Desustream';
          const idMatch = src.match(/id=([^&]+)/);
          if (idMatch) {
            embedId = idMatch[1];
            try {
              const decoded = Buffer.from(embedId, 'base64').toString('utf-8');
              embedKey = decoded;
            } catch {}
          }
          let variant = 'unknown';
          if (src.includes('/ondesu/new/hd/')) variant = 'ondesu_new_hd';
          else if (src.includes('/ondesu/')) variant = 'ondesu';
          else if (src.includes('/arcg/')) variant = 'arcg';
          else if (src.includes('/dstream/')) variant = 'dstream';
          isResponsive = false;
        }

        // ─── Slot 6a: Abyssplayer ──────────────────────────
        else if (src.includes('abyssplayer.com')) {
          slot = 'abyssplayer';
          platform = 'Abyssplayer';
          const idMatch = src.match(/abyssplayer\.com\/([a-zA-Z0-9_]+)/);
          if (idMatch) embedId = idMatch[1];
          isResponsive = false;
        }

        // ─── Slot 6b: Short.ink ─────────────────────────────
        else if (src.includes('short.ink')) {
          slot = 'shortink';
          platform = 'Short.ink';
          const idMatch = src.match(/short\.ink\/([a-zA-Z0-9_]+)/);
          if (idMatch) embedId = idMatch[1];
          isResponsive = false;
        }

        // ─── Slot 6c: Short.icu ─────────────────────────────
        else if (src.includes('short.icu')) {
          slot = 'shorticu';
          platform = 'Short.icu';
          const idMatch = src.match(/short\.icu\/([a-zA-Z0-9_]+)/);
          if (idMatch) embedId = idMatch[1];
          isResponsive = false;
        }

        // ─── NEW: OK.ru ─────────────────────────────────────
        else if (src.includes('ok.ru')) {
          slot = 'okru';
          platform = 'OK.ru';
          const idMatch = src.match(/ok\.ru\/videoembed\/(\d+)/);
          if (idMatch) embedId = idMatch[1];
          isResponsive = false;
          
          // Coba ambil title dari OK.ru page
          try {
            const okRes = await axios.get(src, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              timeout: 10000
            });
            const ok$ = cheerio.load(okRes.data);
            const okTitle = ok$('.vid-card_cnt .vid-card_n').text().trim();
            if (okTitle) embedKey = okTitle;
          } catch {}
        }

        // ─── Unknown ────────────────────────────────────────
        else if (src && src.length > 10) {
          slot = 'unknown';
          platform = 'Unknown Player';
          const idMatch = src.match(/\/([a-zA-Z0-9_\-]+)(?:\?|$)/);
          if (idMatch) embedId = idMatch[1];
        }

        // Skip iframe kosong atau self
        if (!src || src.includes('about:blank') || src.startsWith('javascript:')) continue;

        streams.push({
          slot: slot,
          platform: platform,
          embed_id: embedId,
          embed_key: embedKey || null,
          embed_url: src,
          raw_html: rawHtml,
          is_responsive: isResponsive,
          width: width,
          height: height,
          loading: loading,
          allowfullscreen: allowfullscreen,
          scrolling: scrolling,
          marginwidth: marginwidth,
          marginheight: marginheight,
          variant: slot === 'desustream' ? (src.includes('/arcg/') ? 'arcg' : src.includes('/ondesu/') ? 'ondesu' : 'default') : null
        });
      }

      // ─── Ambil dari Dropdown Server ──────────────────────
      const dropdownServers = [];
      $('select.mirror option').each((_, el) => {
        const $opt = $(el);
        const value = $opt.attr('value');
        const label = $opt.text().trim();
        const index = $opt.attr('data-index') || null;

        if (value && value !== '' && label !== 'Pilih Server/Kualitas' && label !== 'Pilih Server Video') {
          let decodedHtml = '';
          let embedUrl = null;
          try {
            decodedHtml = Buffer.from(value, 'base64').toString('utf-8');
          } catch {
            decodedHtml = value;
          }

          const srcMatch = decodedHtml.match(/src=["']([^"']+)["']/);
          if (srcMatch) embedUrl = srcMatch[1];

          // Detect platform dari decoded
          let platform = 'Unknown';
          if (decodedHtml.includes('blogger.com')) platform = 'Blogger Video';
          else if (decodedHtml.includes('vidhidepro.com')) platform = 'VidHidePro';
          else if (decodedHtml.includes('vidhidevip.com')) platform = 'VidHideVip';
          else if (decodedHtml.includes('mega.nz')) platform = 'Mega.nz';
          else if (decodedHtml.includes('desustream.info')) platform = 'Desustream';
          else if (decodedHtml.includes('abyssplayer.com')) platform = 'Abyssplayer';
          else if (decodedHtml.includes('short.ink')) platform = 'Short.ink';
          else if (decodedHtml.includes('short.icu')) platform = 'Short.icu';
          else if (decodedHtml.includes('ok.ru')) platform = 'OK.ru';

          dropdownServers.push({
            label: label,
            index: index,
            platform: platform,
            embed_url: embedUrl,
            decoded_html: decodedHtml,
            raw_value: value
          });
        }
      });

      // ─── Ambil Navigasi ──────────────────────────────────
      const prevEpisode = $('.nvs a[rel="prev"]').attr('href') || null;
      const nextEpisode = $('.nvs a[rel="next"]').attr('href') || null;
      const animeInfo = $('.nvs.nvsc a').attr('href') || null;

      // ─── Ambil Download Link ─────────────────────────────
      let downloadLink = null;
      $('#download_episode').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href !== '#') {
          downloadLink = href;
        }
      });

      // ─── Response ──────────────────────────────────────────
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          thumbnail: thumbnail,
          url: url,
          streams: streams,
          dropdown_servers: dropdownServers.length > 0 ? dropdownServers : null,
          navigation: {
            prev_episode: prevEpisode,
            next_episode: nextEpisode,
            anime_info: animeInfo
          },
          download_link: downloadLink,
          recommended: streams.find(s => 
            s.slot !== 'unknown' && 
            !s.platform?.includes('ADS')
          ) || streams[0] || null
        }
      });

    } catch (error) {
      console.error('[Animasu Stream Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
