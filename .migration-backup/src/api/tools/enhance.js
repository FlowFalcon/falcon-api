const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function enhanceImage(imageBuffer) {
    const formData = new FormData();
    formData.append('file', imageBuffer, {
        filename: 'upload.jpg',
        contentType: 'image/jpeg'
    });

    const response = await axios.post('https://ihancer.com/api/enhance', formData, {
        headers: {
            ...formData.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
            'Origin': 'https://ihancer.com',
            'Referer': 'https://ihancer.com/app/'
        },
        responseType: 'arraybuffer',
        timeout: 60000
    });

    return Buffer.from(response.data);
}

module.exports = (app) => {
    // GET endpoint untuk test di web (pake URL)
    app.get('/tools/enhance', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL gambar)'
            });
        }

        try {
            const imageRes = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const enhancedBuffer = await enhanceImage(Buffer.from(imageRes.data));
            
            res.setHeader('Content-Type', 'image/jpeg');
            res.send(enhancedBuffer);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal enhance gambar'
            });
        }
    });

    // POST endpoint untuk bot WA (upload file)
    app.post('/tools/enhance', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    error: 'Tidak ada file. Kirim file gambar dengan key "file"'
                });
            }

            const enhancedBuffer = await enhanceImage(req.file.buffer);
            
            res.setHeader('Content-Type', 'image/jpeg');
            res.send(enhancedBuffer);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal enhance gambar'
            });
        }
    });
};
