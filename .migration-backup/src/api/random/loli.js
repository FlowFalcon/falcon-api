const axios = require('axios');

module.exports = (app) => {
    app.get('/random/loli', async (req, res) => {
        try {
            const response = await axios.get('https://api.lolicon.app/setu/v2', {
                params: {
                    tag: ['loli'],
                    num: 1,
                    size: ['regular', 'original'],
                    r18: 0
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const item = response.data?.data?.[0];
            if (!item) {
                return res.status(404).json({
                    status: false,
                    error: 'Gambar tidak ditemukan'
                });
            }

            let imageUrl = item.urls?.regular || item.urls?.original || '';
            
            if (imageUrl.includes('pixiv.re')) {
                imageUrl = `https://pixiv.nl/${item.pid}.png`;
            }

            const imageRes = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const contentType = imageRes.headers['content-type'] || 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'no-cache');
            res.send(imageRes.data);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil gambar loli'
            });
        }
    });
};
