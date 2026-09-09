const axios = require('axios');

module.exports = (app) => {
    app.get('/random/waifu', async (req, res) => {
        let { q = 'waifu' } = req.query;

        try {
            const response = await axios.get('https://api.harzrestapi.web.id/api/v2/anime/waifu', {
                params: { q: q, apikey: 'FREE' },
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                timeout: 15000
            });

            const items = response.data.data?.items || response.data.items || [];
            if (!items.length) throw new Error('Gambar tidak ditemukan');

            const imageUrl = items[0].url;
            res.redirect(imageUrl);

        } catch (error) {
            res.status(500).json({ status: false, error: 'Gagal mengambil gambar waifu' });
        }
    });
};
