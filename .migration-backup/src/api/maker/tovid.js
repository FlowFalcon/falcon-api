const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const BASE = 'https://ezgif.com';
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/147.0.0.0 Mobile Safari/537.36';

async function webpToMp4(imageBuffer, filename = 'image.webp') {
    // Step 1: Upload WebP
    const form1 = new FormData();
    form1.append('new-image', imageBuffer, { filename });
    form1.append('new-image-url', '');
    form1.append('upload', 'Upload!');

    const uploadRes = await axios.post(`${BASE}/webp-to-mp4`, form1, {
        headers: {
            ...form1.getHeaders(),
            'User-Agent': UA,
            'Origin': BASE,
            'Referer': `${BASE}/webp-to-mp4`
        },
        maxRedirects: 5,
        timeout: 30000
    });

    const uploadHtml = uploadRes.data;
    
    // Extract file ID
    const fileMatch = uploadHtml.match(/\/webp-to-mp4\/([^"'<>]+?\.webp)/i);
    if (!fileMatch) throw new Error('Gagal upload WebP');
    const fileId = fileMatch[1];

    // Step 2: Convert to MP4
    const form2 = new FormData();
    form2.append('file', fileId);
    form2.append('background', '#ffffff');
    form2.append('repeat', '1');
    form2.append('ajax', 'true');

    const convertRes = await axios.post(`${BASE}/webp-to-mp4/${fileId}?ajax=true`, form2, {
        headers: {
            ...form2.getHeaders(),
            'User-Agent': UA,
            'Origin': BASE,
            'Referer': `${BASE}/webp-to-mp4/${fileId}.html`
        },
        timeout: 30000
    });

    const convertHtml = convertRes.data;
    
    // Extract MP4 URL
    const mp4Match = convertHtml.match(/<source[^>]+src="([^"]+?\.mp4)"/i);
    if (!mp4Match) throw new Error('Gagal konversi ke MP4');
    
    let mp4Url = mp4Match[1];
    if (mp4Url.startsWith('//')) mp4Url = 'https:' + mp4Url;
    if (mp4Url.startsWith('/')) mp4Url = BASE + mp4Url;

    return mp4Url;
}

module.exports = (app) => {
    // Endpoint POST upload file
    app.post('/maker/tovid', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    error: 'Tidak ada file. Kirim file WebP dengan key "image"'
                });
            }

            // Cek ekstensi
            if (!req.file.originalname.toLowerCase().endsWith('.webp')) {
                return res.status(400).json({
                    status: false,
                    error: 'File harus berformat WebP'
                });
            }

            const mp4Url = await webpToMp4(req.file.buffer, req.file.originalname);
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    original_name: req.file.originalname,
                    video_url: mp4Url,
                    size: req.file.size
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal konversi WebP ke MP4'
            });
        }
    });

    // Endpoint GET dari URL
    app.get('/maker/tovid', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL file WebP)'
            });
        }

        try {
            // Download WebP dari URL
            const imageRes = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': UA }
            });

            const mp4Url = await webpToMp4(Buffer.from(imageRes.data), 'image.webp');
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    original_url: url,
                    video_url: mp4Url
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal konversi WebP ke MP4'
            });
        }
    });
};
