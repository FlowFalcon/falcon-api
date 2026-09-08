const axios = require('axios');

module.exports = (app) => {
    app.get('/maker/bratvid', async (req, res) => {
        const { text } = req.query;

        if (!text) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "text" diperlukan'
            });
        }

        try {
            const response = await axios.get(`https://api.nexray.eu.cc/maker/bratvid?text=${encodeURIComponent(text)}`, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 60000
            });

            const contentType = response.headers['content-type'] || 'video/mp4';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="brat_${text}.mp4"`);
            res.send(response.data);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal generate video brat'
            });
        }
    });
};
