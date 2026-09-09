const { fetchSite, mapUpstreamError } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://donghub.vip";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

// ponytail: only sources donghub actually serves via select.mirror.
// add new source only when a new <option value="...base64..."> label appears.
const SOURCE_LABEL_MAP = {
  'dailymotion': 'Dailymotion',
  'ok.ru':       'OK.ru',
  'okru':        'OK.ru',
  'rumble':      'Rumble',
  'd.tube':      'D-Tube',
  'play.d.tube': 'D-Tube',
  'abyssplayer': 'AbyssPlayer',
  'videoplayer': 'VideoPlayer.vip',
  'streamtape':  'Streamtape',
  'mp4upload':   'MP4Upload',
  'morencius':   'Vidhide',
  'youtube':     'YouTube'
};

const detectSource = (url) => {
  const u = (url || '').toLowerCase();
  for (const key of Object.keys(SOURCE_LABEL_MAP)) {
    if (u.includes(key)) return SOURCE_LABEL_MAP[key];
  }
  return 'Unknown';
};

const extractVideoId = (url, source) => {
  try {
    const u = new URL(url);
    if (source === 'Dailymotion') {
      // geo.dailymotion.com/player/xid0t.html?video=XXXX
      // www.dailymotion.com/embed/video/XXXX
      const v = u.searchParams.get('video');
      if (v) return v;
      const m = u.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
      if (m) return m[1];
    }
    if (source === 'OK.ru') {
      const m = u.pathname.match(/videoembed\/(\d+)/);
      if (m) return m[1];
    }
    if (source === 'Rumble') {
      const m = u.pathname.match(/embed\/(v[a-zA-Z0-9]+)/);
      if (m) return m[1];
    }
    if (source === 'D-Tube') {
      // play.d.tube/?v=UUID
      const v = u.searchParams.get('v');
      if (v) return v;
    }
  } catch {}
  return null;
};

module.exports = (app) => {

  app.get('/donghua/stream', async (req, res) => {
    const { slug, server } = req.query;

    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "slug" diperlukan (contoh: ?slug=peerless-martial-spirit-episode-440-subtitle-indonesia)'
      });
    }

    try {
      const data = await fetchSite(`${BASE_URL}/${slug}/`);

      const $ = cheerio.load(data);

      const servers = [];

      // ─── Ambil SEMUA server dari <select class="mirror"> ───
      // donghub menyimpan iframe src di <option value="<base64>"> per server.
      // Decode → dapat URL embed langsung dari sumber (dailymotion/dtube/okru/dll).
      // URL upstream resmi → tidak diblokir seperti iframe wrapper pihak ketiga.
      $('select.mirror option').each((_, el) => {
        const $opt = $(el);
        const raw = $opt.attr('value');
        if (!raw) return;                       // skip "Select Video Server"

        let decoded = '';
        try {
          decoded = Buffer.from(raw, 'base64').toString('utf-8');
        } catch {
          return;
        }

        const $frame = cheerio.load(decoded);
        const src = $frame('iframe').attr('src');
        if (!src) return;

        const label = $opt.text().trim().replace(/\s+/g, ' ') || null;
        const source = detectSource(src);
        const videoId = extractVideoId(src, source);

        let watchUrl = null;
        if (source === 'OK.ru' && videoId)            watchUrl = `https://ok.ru/video/${videoId}`;
        else if (source === 'Dailymotion' && videoId) watchUrl = `https://www.dailymotion.com/video/${videoId}`;
        else if (source === 'Rumble' && videoId)      watchUrl = `https://rumble.com/${videoId}`;
        else if (source === 'D-Tube' && videoId)      watchUrl = `https://play.d.tube/?v=${videoId}`;

        servers.push({
          label: label,
          source: source,
          video_id: videoId,
          embed_url: src,
          watch_url: watchUrl || src
        });
      });

      // ─── Fallback 1: iframe langsung di halaman (tanpa base64) ───
      if (servers.length === 0) {
        $('#embed_holder iframe').each((_, el) => {
          const src = $(el).attr('src');
          if (!src) return;
          const source = detectSource(src);
          const videoId = extractVideoId(src, source);
          servers.push({
            label: null,
            source: source,
            video_id: videoId,
            embed_url: src,
            watch_url: src
          });
          return false;
        });
      }

      if (servers.length === 0) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Link streaming tidak ditemukan',
          note: 'Pastikan slug episode benar'
        });
      }

      const title = $('.entry-title').text().trim()
                  || $('h1').first().text().trim()
                  || 'Donghua Episode';

      // Filter ?server= jika user minta spesifik (case-insensitive substring match).
      const filtered = server
        ? servers.filter(s => (s.source || '').toLowerCase().includes(String(server).toLowerCase()))
        : servers;

      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          slug: slug,
          url: `${BASE_URL}/${slug}/`,
          total_servers: filtered.length,
          servers: filtered
        }
      });

    } catch (error) {
      console.error('[Donghua Stream Error]', error.message);
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
