const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');

module.exports = function (app) {
  app.get('/ai/kivotos', async (req, res) => {
    const {
      prompt,
      style = 'anime',
      width = 1024,
      height = 1024,
      guidance_scale = 7,
      inference_steps = 28
    } = req.query;

    const negative_prompt = 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality, low score, bad score, average score, signature, watermark, username, blurry';

    const styles = ['anime', 'real', 'photo'];
    if (!prompt) return res.status(400).json({ status: false, message: 'Parameter prompt wajib diisi' });
    if (!styles.includes(style)) return res.status(400).json({ status: false, message: `Style harus salah satu dari: ${styles.join(', ')}` });

    try {
      const proxyRes = await axios.get('https://proxylist.geonode.com/api/proxy-list?limit=20&page=1&sort_by=lastChecked&sort_type=desc&protocols=https');
      const proxies = proxyRes.data.data || [];
      if (!proxies.length) throw new Error('Proxy list kosong');

      const random = proxies[Math.floor(Math.random() * proxies.length)];
      const proxyUrl = `http://${random.ip}:${random.port}`;
      const agent = new HttpsProxyAgent(proxyUrl);

      const session_hash = Math.random().toString(36).substring(2);
      const base = `https://heartsync-nsfw-uncensored${style !== 'anime' ? `-${style}` : ''}.hf.space`;

      // 1. Join Queue
      await axios.post(`${base}/gradio_api/queue/join`, {
        data: [prompt, negative_prompt, 0, true, +width, +height, +guidance_scale, +inference_steps],
        event_data: null,
        fn_index: 2,
        trigger_id: 16,
        session_hash
      }, {
        httpsAgent: agent,
        headers: { 'Content-Type': 'application/json' }
      });

      // 2. Get Queue Result
      const { data: stream } = await axios.get(`${base}/gradio_api/queue/data?session_hash=${session_hash}`, {
        httpsAgent: agent,
        responseType: 'text'
      });

      const lines = stream.split('\n\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const parsed = JSON.parse(line.substring(6));
          if (parsed.msg === 'process_completed') {
            const resultUrl = parsed.output?.data?.[0]?.url;
            if (resultUrl) {
              const image = await axios.get(resultUrl, {
                responseType: 'arraybuffer',
                headers: { Referer: base },
                httpsAgent: agent
              });

              res.setHeader('Content-Type', 'image/png');
              return res.send(image.data);
            }
          }
        }
      }

      throw new Error('Gagal mendapatkan gambar NSFW');

    } catch (err) {
      return res.status(500).json({
        status: false,
        message: 'Gagal generate NSFW image',
        error: err.message
      });
    }
  });
};
