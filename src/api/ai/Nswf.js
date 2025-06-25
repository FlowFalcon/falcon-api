const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

module.exports = function (app) {
  app.get('/ai/nsfw', async (req, res) => {
  const { prompt, style = 'anime' } = req.query;

  console.log('Incoming request:', { prompt, style }); // <-- tambahin log

  if (!prompt) {
    return res.status(400).json({ status: false, message: 'Parameter prompt wajib diisi' });
  }
    try {
      const imageBuffer = await generateNSFWImage(prompt, { style });
      res.setHeader('Content-Type', 'image/jpeg');
      return res.send(imageBuffer);
    } catch (err) {
      return res.status(500).json({
        status: false,
        creator: 'FlowFalcon',
        message: 'Gagal generate NSFW image',
        error: err.message
      });
    }
  });
};

// =======================
// 🔧 FUNGSI UTAMA
// =======================
async function generateNSFWImage(prompt, options = {}) {
  const {
    negative_prompt = 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, cropped, worst quality, low quality, low score, average score, signature, watermark, username, blurry',
    style = 'anime',
    width = 1024,
    height = 1024,
    guidance_scale = 7,
    inference_steps = 28
  } = options;

  const styles = ['anime', 'real', 'photo'];
  if (!styles.includes(style)) throw new Error(`Style harus salah satu dari: ${styles.join(', ')}`);

  const proxy = await getProxyFromScrape();
  const agent = new HttpsProxyAgent(proxy);

  const session_hash = Math.random().toString(36).substring(2);
  const base = `https://heartsync-nsfw-uncensored${style !== 'anime' ? `-${style}` : ''}.hf.space`;

  // Step 1: Join queue
  await axios.post(`${base}/gradio_api/queue/join`, {
    data: [prompt, negative_prompt, 0, true, width, height, guidance_scale, inference_steps],
    event_data: null,
    fn_index: 2,
    trigger_id: 16,
    session_hash
  }, {
    headers: { 'Content-Type': 'application/json' },
    httpsAgent: agent
  });

  // Step 2: Ambil hasilnya
  const { data: stream } = await axios.get(`${base}/gradio_api/queue/data?session_hash=${session_hash}`, {
    httpsAgent: agent,
    responseType: 'text'
  });

  const lines = stream.split('\n\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const parsed = JSON.parse(line.slice(6));
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

  throw new Error('Gagal mendapatkan hasil NSFW');
}

// =======================
// 🔧 Ambil Proxy dari ProxyScrape
// =======================
async function getProxyFromScrape() {
  const res = await axios.get(
    'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text'
  );
  const proxies = res.data
    .trim()
    .split('\n')
    .filter(x => x.startsWith('http://') || x.startsWith('https://'));

  if (!proxies.length) throw new Error('Proxy list kosong');
  return proxies[Math.floor(Math.random() * proxies.length)];
}
