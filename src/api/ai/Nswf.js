const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ProxyAgent = require('@rynn-k/proxy-agent');

module.exports = function (app) {
  /**
   * Ambil proxy random dari file ploxy.txt
   */
  function getProxyAgentFromFile() {
    try {
      const filePath = path.join(__dirname, 'ploxy.txt');
      const proxy = new ProxyAgent(filePath, { random: true });
      return proxy.config();
    } catch (err) {
      throw new Error('Gagal ambil proxy dari file: ' + err.message);
    }
  }

  /**
   * Endpoint: /nsfw/generate
   * Query: prompt (wajib), style (anime/real/photo), width, height, guidance, steps
   */
  app.get('/nsfw/generate', async (req, res) => {
    const {
      prompt,
      style = 'anime',
      width = 1024,
      height = 1024,
      guidance = 7,
      steps = 28
    } = req.query;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        creator: "FlowFalcon",
        message: 'Parameter prompt wajib'
      });
    }

    const styles = ['anime', 'real', 'photo'];
    if (!styles.includes(style)) {
      return res.status(400).json({
        status: false,
        creator: "FlowFalcon",
        message: `Style harus salah satu dari: ${styles.join(', ')}`
      });
    }

    try {
      const proxyConfig = getProxyAgentFromFile();
      const session_hash = Math.random().toString(36).slice(2);
      const base = `https://heartsync-nsfw-uncensored${style !== 'anime' ? `-${style}` : ''}.hf.space`;

      const negative_prompt = 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, cropped, worst quality, low quality, watermark, blurry';

      // Join queue
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

      // Polling result
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

      res.status(500).json({
        status: false,
        creator: "FlowFalcon",
        message: 'Gagal mendapatkan gambar dari server NSFW'
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "FlowFalcon",
        message: 'Gagal generate NSFW image',
        error: err.message
      });
    }
  });
};
