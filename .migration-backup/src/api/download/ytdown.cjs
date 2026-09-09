const axios = require("axios");

module.exports = (app) => {
  app.get('/download/ytmp3', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "url" wajib diisi'
        });
      }

      // Panggil API Harzrest
      const apiUrl = `https://api.harzrestapi.web.id/api/v2/ytmp3?q=${encodeURIComponent(url)}&apikey=FREE`;
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (!data.success) {
        return res.status(500).json({
          status: false,
          error: data.message || 'Gagal fetch dari API Harzrest'
        });
      }

      // Mapping all_medias ke format Axly
      const formats = [];
      if (data.all_medias && Array.isArray(data.all_medias)) {
        // Filter audio only
        const audioMedias = data.all_medias.filter(m => m.type === 'audio');
        for (const media of audioMedias) {
          formats.push({
            format: media.label || media.quality || media.ext || 'audio',
            ext: media.ext || 'm4a',
            bitrate: media.bitrate || null,
            audio_quality: media.audioQuality || null,
            audio_sample_rate: media.audioSampleRate || null,
            download_url: media.url || null
          });
        }
      }

      // Kalau ga ada all_medias, fallback ke result.audio
      if (formats.length === 0 && data.result && data.result.audio) {
        const audio = data.result.audio;
        formats.push({
          format: audio.label || audio.quality || 'audio',
          ext: audio.ext || 'm4a',
          bitrate: audio.bitrate || null,
          audio_quality: audio.audioQuality || null,
          audio_sample_rate: audio.audioSampleRate || null,
          download_url: audio.url || null
        });
      }

      res.json({
        status: true,
        creator: "AxlyDev",
        data: {
          judul: data.title || data.result?.title || "-",
          channel: data.author || data.result?.author || "-",
          thumbnail: data.thumbnail || data.result?.thumbnail || "-",
          duration: data.duration || data.result?.duration || null,
          source: data.source || null,
          latency: data.latency || null,
          formats: formats.length > 0 ? formats : [
            { format: "Audio", status: false, download_url: null }
          ]
        }
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message || "Terjadi kesalahan server"
      });
    }
  });
};
