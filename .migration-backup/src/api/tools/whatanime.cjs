const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function whatanime(imageBuffer, filename = 'image.jpg') {
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename: filename });

    const response = await axios.post('https://api.trace.moe/search?anilistInfo', formData, {
        headers: {
            ...formData.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
    });

    if (!response.data?.result || response.data.result.length === 0) {
        throw new Error('Tidak ada hasil ditemukan');
    }

    const result = response.data.result[0];
    
    // Format waktu
    const fromSec = result.from;
    const toSec = result.to;
    const fromTime = `${Math.floor(fromSec / 60)}:${Math.floor(fromSec % 60).toString().padStart(2, '0')}`;
    const toTime = `${Math.floor(toSec / 60)}:${Math.floor(toSec % 60).toString().padStart(2, '0')}`;

    return {
        anilist_id: result.anilist,
        filename: result.filename,
        episode: result.episode,
        from: fromTime,
        to: toTime,
        similarity: result.similarity,
        video: result.video,
        image: result.image,
        title_native: result.title?.native || null,
        title_romaji: result.title?.romaji || null,
        title_english: result.title?.english || null
    };
}

module.exports = (app) => {
    // Endpoint POST upload file langsung
    app.post('/tools/whatanime', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    error: 'Tidak ada file. Kirim gambar dengan key "image"'
                });
            }

            const result = await whatanime(req.file.buffer, req.file.originalname);
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mencari anime'
            });
        }
    });

    // Endpoint GET dari URL
    app.get('/tools/whatanime', async (req, res) => {
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

            const result = await whatanime(Buffer.from(imageRes.data), 'image.jpg');
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mencari anime'
            });
        }
    });
};
