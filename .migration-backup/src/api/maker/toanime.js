const axios = require('axios');

module.exports = (app) => {
    app.get('/maker/toanime', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan'
            });
        }

        try {
            const response = await axios.get('https://www.neoapis.xyz/api/ai-image/toanime', {
                params: { url: url },
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 60000
            });

            const contentType = response.headers['content-type'] || 'image/png';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="anime.png"`);
            res.send(response.data);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal konversi ke anime'
            });
        }
    });
};
