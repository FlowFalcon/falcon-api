const axios = require('axios');

module.exports = (app) => {
    app.get('/maker/qc', async (req, res) => {
        const { text, name, avatar, color } = req.query;

        if (!text) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "text" diperlukan'
            });
        }

        // Parameter opsional dengan default
        const params = {
            text: text,
            name: name || 'AxlyDev',
            avatar: avatar || 'https://files.catbox.moe/uv5fbn.jpg',
            color: color || 'putih'
        };

        try {
            const response = await axios.get(`https://api.nexray.eu.cc/maker/qc`, {
                params: params,
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            const contentType = response.headers['content-type'] || 'image/png';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="qc_${text}.png"`);
            res.send(response.data);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal generate gambar QC'
            });
        }
    });
};
