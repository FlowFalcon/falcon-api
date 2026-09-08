const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const CONFIG = {
    pkey: "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlHZk1BMEdDU3FHU0liM0RRRUJBUVVBQTRHTkFEQ0JpUUtCZ1FDd2xPK2JvQzZjd1JvM1VmWFZCYWRhWXdjWDB6S1MyZnVWTlkycVowZGd3YjFOSisvUTlGZUFvc0w0T05pb3NENzFvbjNQVllxUlVsTDUwNDVtdkgySzlpOGJBRlZNRWlwN0U2Uk1LNnRLQUFpZjd4elpyWG5QMUdaNVJpanRxZGd3aCtZbXpUbzM5Y3VCQ3NacUs5b0VvZVEzci9teUc5Uys5Y1I1aHVUdUZRSURBUUFCCi0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQ==",
    aid: "aifaceswap",
    uid: "1H5tRtzsBkqXcaJ",
    origin: "8f3f0c7387123ae0",
    theme_version: '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q',
    model: 'nano_banana_2'
};

// Fungsi buat generate FP baru setiap request
function generateNewFp() {
    return crypto.randomBytes(16).toString('hex');
}

let currentFp = generateNewFp();

const crypt = {
    aes: (data, key) => {
        const cipher = crypto.createCipheriv('aes-128-cbc', key, key);
        return Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]).toString('base64');
    },
    rsa: (data) => {
        return crypto.publicEncrypt({
            key: Buffer.from(CONFIG.pkey, "base64").toString(),
            padding: crypto.constants.RSA_PKCS1_PADDING,
        }, Buffer.from(data, 'utf8')).toString('base64');
    }
};

const api = axios.create({
    baseURL: 'https://app-v1.live3d.io',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 16) Chrome/143.0.7499.34 Mobile Safari/537.36',
        'Origin': 'https://live3d.io',
        'Referer': 'https://live3d.io/',
        'theme-version': CONFIG.theme_version
    }
});

// Interceptor untuk sign request
api.interceptors.request.use((cfg) => {
    const i = crypto.randomBytes(8).toString('hex');
    const d = crypto.randomUUID();
    const n = Math.floor(Date.now() / 1000);
    
    const s = crypt.rsa(i);
    const signStr = cfg.url.includes('upload-img') ? `${CONFIG.aid}:${d}:${s}` : `${CONFIG.aid}:${CONFIG.uid}:${n}:${d}:${s}`;
    
    Object.assign(cfg.headers, {
        'fp': currentFp,
        'fp1': crypt.aes(`${CONFIG.aid}:${currentFp}`, i),
        'x-guide': s,
        'x-sign': crypt.aes(signStr, i),
        'x-code': Date.now().toString()
    });
    
    return cfg;
});

async function editImage(imageBuffer, prompt, retryCount = 0) {
    // Refresh FP setiap request baru
    currentFp = generateNewFp();
    
    try {
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'input.jpg', contentType: 'image/jpeg' });
        form.append('fn_name', 'demo-image-editor');
        form.append('request_from', '9');
        form.append('origin_from', CONFIG.origin);
        
        const uploadRes = await api.post('/aitools/upload-img', form, { headers: form.getHeaders() });
        if (!uploadRes.data?.data?.path) throw new Error('Upload gagal');
        
        const jobRes = await api.post('/aitools/of/create', {
            fn_name: 'demo-image-editor',
            call_type: 3,
            input: {
                model: CONFIG.model,
                source_images: [uploadRes.data.data.path],
                prompt: prompt,
                aspect_radio: 'auto',
                request_from: 9
            },
            data: '',
            request_from: 9,
            origin_from: CONFIG.origin
        });
        
        const taskId = jobRes.data?.data?.task_id;
        if (!taskId) throw new Error('TaskId tidak ditemukan');
        
        // Polling status
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const statusRes = await api.post('/aitools/of/check-status', {
                task_id: taskId,
                fn_name: 'demo-image-editor',
                call_type: 3,
                request_from: 9,
                origin_from: CONFIG.origin
            });
            
            if (statusRes.data?.data?.status === 2) {
                return `https://temp.live3d.io/${statusRes.data.data.result_image}`;
            } else if (statusRes.data?.data?.status === 3) {
                throw new Error('Task failed');
            } else if (statusRes.data?.data?.status === 4) {
                throw new Error('Task expired atau quota habis');
            }
        }
        throw new Error('Timeout');
        
    } catch (error) {
        // Retry dengan delay lebih lama kalau kena limit
        if (retryCount < 2 && (error.message === 'TaskId tidak ditemukan' || error.message.includes('quota'))) {
            console.log(`Retry ${retryCount + 1} setelah 10 detik...`);
            await new Promise(r => setTimeout(r, 10000));
            return editImage(imageBuffer, prompt, retryCount + 1);
        }
        throw error;
    }
}

module.exports = (app) => {
    app.post('/ai/nanobanana', upload.single('image'), async (req, res) => {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ status: false, error: 'Parameter "prompt" diperlukan' });
        if (!req.file) return res.status(400).json({ status: false, error: 'Kirim file gambar' });

        try {
            const imageUrl = await editImage(req.file.buffer, prompt);
            const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            res.setHeader('Content-Type', 'image/jpeg');
            res.send(imageRes.data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message });
        }
    });

    app.get('/ai/nanobanana', async (req, res) => {
        const { prompt, url } = req.query;
        if (!prompt) return res.status(400).json({ status: false, error: 'Parameter "prompt" diperlukan' });
        if (!url) return res.status(400).json({ status: false, error: 'Parameter "url" diperlukan' });

        try {
            const imageRes = await axios.get(url, { responseType: 'arraybuffer' });
            const resultUrl = await editImage(Buffer.from(imageRes.data), prompt);
            const finalRes = await axios.get(resultUrl, { responseType: 'arraybuffer' });
            res.setHeader('Content-Type', 'image/jpeg');
            res.send(finalRes.data);
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
