const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');

module.exports = function (app) {
  async function getRandomProxy() {
    try {
      const res = await axios.get('https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text');
      const proxies = res.data.trim().split('\n').filter(x => x);

      if (!proxies.length) throw new Error('Proxy list kosong');

      const random = proxies[Math.floor(Math.random() * proxies.length)];
      return new HttpsProxyAgent('http://' + random);
    } catch (err) {
      throw new Error('Gagal mengambil proxy: ' + err.message);
    }
  }

  async function nsfwImage(prompt, style = 'anime') {
    try {
      const negative = 'lowres, bad anatomy, bad hands, text, error, cropped, signature, watermark';
      const width = 1024;
      const height = 1024;
      const guidance = 7;
      const steps = 28;
      const styles = ['anime', 'real', 'photo'];

      if (!prompt) throw new Error('Prompt wajib diisi');
      if (!styles.includes(style)) throw new Error(`Style harus salah satu dari: ${styles.join(', ')}`);

      const agent = await getRandomProxy();
      const session_hash = Math.random().toString(36).substring(2);
      const base = `https://heartsync-nsfw-uncensored${style !== 'anime' ? `-${style}` : ''}.hf.space`;

      // 1. Join Queue
      await axios.post(`${base}/gradio_api/queue/join`, {
        data: [prompt, negative, 0, true, width, height, guidance, steps],
        event_data: null,
        fn_index: 2,
        trigger_id: 16,
        session_hash
      }, {
        httpsAgent: agent,
        headers: { 'Content-Type': 'application/json' }
      });

      // 2. Poll Result
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
              const img = await axios.get(resultUrl, {
                responseType: 'arraybuffer',
                headers: { Referer: base },
                httpsAgent: agent
              });
              return img.data;
            }
          }
        }
      }

      throw new Error('Gagal mendapatkan hasil NSFW image');
    } catch (err) {
      throw new Error('Gagal generate NSFW image: ' + err.message);
    }
  }

  app.get('/ai/kivotos', async (req, res) => {
    const { prompt, style = 'anime' } = req.query;
    if (!prompt) return res.status(400).json({ status: false, message: 'Parameter prompt wajib' });

    try {
      const image = await nsfwImage(prompt, style);
      res.setHeader('Content-Type', 'image/png');
      res.send(image);
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: 'FlowFalcon',
        message: 'Gagal generate NSFW image',
        error: err.message
      });
    }
  });
};
