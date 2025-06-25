const axios = require('axios');
const ProxyAgent = require('@rynn-k/proxy-agent');

module.exports = function (app) {
  const proxy = new ProxyAgent(path.join(__dirname, 'proxies.txt');, { random: true }); // file harus tersedia

  app.get('/nsfw/generate', async (req, res) => {
    const {
      prompt,
      style = 'anime',
      width = 1024,
      height = 1024,
      guidance = 7,
      steps = 28
    } = req.query;

    const styles = ['anime', 'real', 'photo'];

    if (!prompt) {
      return res.status(400).json({ status: false, message: 'Parameter prompt wajib diisi' });
    }

    if (!styles.includes(style)) {
      return res.status(400).json({ status: false, message: `Style harus salah satu dari: ${styles.join(', ')}` });
    }

    try {
      const agent = proxy.config(); // ambil proxy aktif
      const session_hash = Math.random().toString(36).substring(2);
      const base = `https://heartsync-nsfw-uncensored${style !== 'anime' ? `-${style}` : ''}.hf.space`;

      const negative_prompt = 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality, watermark, blurry';

      // Join ke queue
      await axios.post(`${base}/gradio_api/queue/join`, {
        data: [
          prompt,
          negative_prompt,
          0,
          true,
          parseInt(width),
          parseInt(height),
          parseFloat(guidance),
          parseInt(steps)
        ],
        event_data: null,
        fn_index: 2,
        trigger_id: 16,
        session_hash
      }, agent);

      // Ambil hasil queue
      const { data: stream } = await axios.get(`${base}/gradio_api/queue/data?session_hash=${session_hash}`, agent);
      const lines = stream.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const d = JSON.parse(line.slice(6));
          if (d.msg === 'process_completed') {
            const imageUrl = d.output?.data?.[0]?.url;
            if (imageUrl) {
              const image = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                headers: { Referer: base },
                ...agent
              });
              res.setHeader('Content-Type', 'image/png');
              return res.send(image.data);
            }
          }
        }
      }

      return res.status(500).json({
        status: false,
        message: 'Gagal mendapatkan gambar dari server NSFW'
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: 'Gagal generate NSFW image',
        error: err.message
      });
    }
  });
};
