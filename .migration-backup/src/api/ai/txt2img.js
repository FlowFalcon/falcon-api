const axios = require('axios');

module.exports = (app) => {
    app.get('/ai/text2image', async (req, res) => {
        const { prompt } = req.query;

        if (!prompt) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "prompt" diperlukan'
            });
        }

        try {
            // Pollinations.ai - gratis, tanpa API key
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
            
            // Cek apakah gambar bisa diakses
            await axios.head(imageUrl);
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    prompt: prompt,
                    image_url: imageUrl,
                    source: 'pollinations.ai'
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};
