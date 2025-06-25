const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ProxyAgent = require('@rynn-k/proxy-agent');

module.exports = function (app) {
  function getProxyAgentFromFile() {
    try {
      const filePath = path.resolve(__dirname, 'ploxy.txt');
      const content = fs.readFileSync(filePath, 'utf-8');
      const proxies = content.split('\n').map(p => p.trim()).filter(p => p.startsWith('http'));
      if (!proxies.length) throw new Error('No proxies available');

      const proxy = new ProxyAgent({ proxies, random: true });
      return proxy.config(); // <-- yang dikembalikan adalah config-nya
    } catch (err) {
      throw new Error('Gagal ambil proxy dari file: ' + err.message);
    }
  }

  app.get('/nsfw/generate', async (req, res) => {
    const {
      prompt,
      style = 'anime',
      width = 1024,
      height = 1024,
      guidance = 7,
      steps = 28
    } = req.query;

    if (!prompt) return res.status(400).json({ status: false, message: 'Parameter prompt wajib' });

    const styles = ['anime', 'real', 'photo'];
    if (!styles.includes(style)) return res.status(400).json({ status: false, message: `Style harus salah satu dari: ${styles.join(', ')}` });

    try {
      const proxyConfig = getProxyAgentFromFile();
      const session_hash = Math.random().toString(36).slice(2);
      const negative_prompt = 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, cropped, worst quality, low quality, watermark, blurry';
      const base = `https://heartsync-nsfw-uncensored${style !== 'anime' ? `-${style}` : ''}.hf.space`;

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
      }, proxyConfig);

      const { data: stream } = await axios.get(`${base}/gradio_api/queue/data?session_hash=${session_hash}`, proxyConfig);
      const lines = stream.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const d = JSON.parse(line.slice(6));
          if (d.msg === 'process_completed') {
            const url = d.output?.data?.[0]?.url;
            if (url) {
              const image = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: { Referer: base },
                ...proxyConfig
              });
              res.setHeader('Content-Type', 'image/png');
              return res.send(image.data);
            }
          }
        }
      }

      res.status(500).json({ status: false, message: 'Gagal mendapatkan gambar dari server NSFW' });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: 'Gagal generate NSFW image',
        error: err.message
      });
    }
  });
};
