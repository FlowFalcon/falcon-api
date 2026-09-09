/**
 *   NAMA SCRAPE  :: YOUTUBE DOWNLOADER
 *   
 *   [•] PEMBUAT      :: DEFAN
 *   [•] WEB          :: soonex.biz.id
 *   [•] DESKRIPSI    :: Download video/audio YouTube berbagai format
 *   [•] BASIS        :: yt-dlp (direct CDN)
 *   [•] CHANNEL      :: https://whatsapp.com/channel/0029VbCWturICVfd01iF0y47
 *   
 *   [!] PERHATIAN:
 *   Dilarang mengubah atau menyebarkan tanpa izin pembuat.
 *   HORMATI PEMBUAT, JANGAN HAPUS WATERMARK INI!
 */

const { execFile } = require('child_process');
const https = require('https');
const path = require('path');

const YTDLP_BIN = path.join(__dirname, '../../../bin/yt-dlp');

function getYtInfo(url) {
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_BIN,
      ['--js-runtimes', 'nodejs', '--dump-json', '--no-playlist', '--no-warnings', url],
      { timeout: 90000 },
      (err, stdout) => {
        if (err) return reject(new Error('yt-dlp gagal: ' + err.message));
        try { resolve(JSON.parse(stdout)); }
        catch (e) { reject(new Error('Gagal parse output yt-dlp')); }
      }
    );
  });
}

function checkDMCA(url) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'dmca.ytmp3.gg',
      path: '/api/check?url=' + encodeURIComponent(url),
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 8000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { resolve({ blocked: false }); }
      });
    });
    req.on('error', () => resolve({ blocked: false }));
    req.on('timeout', () => { req.destroy(); resolve({ blocked: false }); });
    req.end();
  });
}

function pickVideoUrl(formats, heightTarget) {
  const candidates = formats.filter(f =>
    f.vcodec !== 'none' &&
    f.ext === 'mp4' &&
    f.height === heightTarget
  );
  const withAudio = candidates.find(f => f.acodec !== 'none');
  return (withAudio || candidates[0] || null)?.url || null;
}

function pickAudioUrl(formats, minKbps, maxKbps) {
  const candidates = formats.filter(f =>
    f.vcodec === 'none' &&
    f.ext === 'm4a' &&
    typeof f.abr === 'number' &&
    f.abr >= minKbps &&
    f.abr <= maxKbps
  ).sort((a, b) => b.abr - a.abr);
  return candidates[0]?.url || null;
}

function buildVideoFormats(formats) {
  const targets = [
    { label: 'MP4 1080P', height: 1080 },
    { label: 'MP4 720P',  height: 720  },
    { label: 'MP4 480P',  height: 480  },
    { label: 'MP4 360P',  height: 360  },
    { label: 'MP4 144P',  height: 144  },
  ];
  return targets.map(t => {
    const url = pickVideoUrl(formats, t.height);
    return { format: t.label, status: !!url, download_url: url };
  });
}

function buildAudioFormats(formats) {
  const targets = [
    { label: 'MP3 320kbps', min: 280, max: 600 },
    { label: 'MP3 192kbps', min: 150, max: 279 },
    { label: 'MP3 128kbps', min: 100, max: 149 },
    { label: 'MP3 64kbps',  min: 40,  max: 99  },
    { label: 'M4A',         min: 40,  max: 600 },
  ];
  return targets.map(t => {
    const url = pickAudioUrl(formats, t.min, t.max);
    return { format: t.label, status: !!url, download_url: url };
  });
}

module.exports = (app) => {

  // GET /download/ytmp4?url=xxx
  app.get('/download/ytmp4', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter url (link YouTube) wajib diisi' });
      }
      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'URL harus dari YouTube' });
      }

      const [dmca, info] = await Promise.all([checkDMCA(url), getYtInfo(url)]);

      if (dmca.blocked) {
        return res.status(403).json({ status: false, creator: 'AxlyDev', error: 'Video kena DMCA, tidak bisa didownload.' });
      }

      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          judul: info.title || '-',
          channel: info.uploader || info.channel || '-',
          thumbnail: info.thumbnail || '-',
          format: buildVideoFormats(info.formats || [])
        }
      });

    } catch (error) {
      res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
    }
  });

  // GET /download/ytmp3?url=xxx
  app.get('/download/ytmp3', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter url (link YouTube) wajib diisi' });
      }
      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'URL harus dari YouTube' });
      }

      const [dmca, info] = await Promise.all([checkDMCA(url), getYtInfo(url)]);

      if (dmca.blocked) {
        return res.status(403).json({ status: false, creator: 'AxlyDev', error: 'Video kena DMCA, tidak bisa didownload.' });
      }

      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          judul: info.title || '-',
          channel: info.uploader || info.channel || '-',
          thumbnail: info.thumbnail || '-',
          format: buildAudioFormats(info.formats || [])
        }
      });

    } catch (error) {
      res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
    }
  });

  // GET /download/ytdown?url=xxx  (gabungan video + audio)
  app.get('/download/ytdown', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter url (link YouTube) wajib diisi' });
      }
      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'URL harus dari YouTube' });
      }

      const [dmca, info] = await Promise.all([checkDMCA(url), getYtInfo(url)]);

      if (dmca.blocked) {
        return res.status(403).json({ status: false, creator: 'AxlyDev', error: 'Video kena DMCA, tidak bisa didownload.' });
      }

      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          judul: info.title || '-',
          channel: info.uploader || info.channel || '-',
          thumbnail: info.thumbnail || '-',
          videos: buildVideoFormats(info.formats || []),
          audios: buildAudioFormats(info.formats || [])
        }
      });

    } catch (error) {
      res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
    }
  });

};
