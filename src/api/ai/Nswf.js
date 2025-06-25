const axios = require('axios');
const fs = require('fs');
const path = require('path');
const {HttpsProxyAgent} = require('https-proxy-agent');

module.exports = function (app) {
  const proxyPath = path.join(__dirname, 'ploxy.txt');

  function getRandomProxyAgent() {
    try {
      if (!fs.existsSync(proxyPath)) throw new Error('File proxies tidak ditemukan');
      const proxies = fs.readFileSync(proxyPath, 'utf-8')
        .split('\n')
        .map(p => p.trim())
        .filter(p => p && p.startsWith('http'));

      if (!proxies.length) throw new Error('Proxy list kosong');
      const random = proxies[Math.floor(Math.random() * proxies.length)];
      return new HttpsProxyAgent(random);
    } catch (err) {
      throw new Error('Gagal ambil proxy dari file: ' + err.message);
    }
  }

  app.get('/ai/kivotos', async (req, res) => {
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
    if (!styles.includes(style)) {
      return res.status(400).json({ status: false, message: `Style harus salah satu dari: ${styles.join(', ')}` });
    }

    try {
      const httpsAgent = getRandomProxyAgent();
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
      }, { httpsAgent });

      // Polling sampai result keluar (maks 30 detik)
      let resultUrl = null;
      const maxTries = 30;

      for (let i = 0; i < maxTries; i++) {
        const { data: stream } = await axios.get(`${base}/gradio_api/queue/data?session_hash=${session_hash}`, {
          httpsAgent,
          responseType: 'text'
        });

        const lines = stream.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const d = JSON.parse(line.slice(6));
            if (d.msg === 'process_completed') {
              resultUrl = d.output?.data?.[0]?.url;
              break;
            }
          }
        }

        if (resultUrl) break;
        await new Promise(r => setTimeout(r, 2000)); // delay 2 detik
      }

      if (resultUrl) {
        const img = await axios.get(resultUrl, {
          responseType: 'arraybuffer',
          headers: { Referer: base },
          httpsAgent
        });
        res.setHeader('Content-Type', 'image/png');
        return res.send(img.data);
      }

      res.status(500).json({
        status: false,
        creator: "FlowFalcon",
        message: 'Gagal mendapatkan gambar dari server NSFW (Timeout)'
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
