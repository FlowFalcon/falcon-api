const axios = require('axios');

module.exports = (app) => {
    app.get('/maker/fakelobyml', async (req, res) => {
        const { avatar, nickname } = req.query;

        if (!avatar) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "avatar" diperlukan (URL avatar)'
            });
        }

        if (!nickname) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "nickname" diperlukan'
            });
        }

        try {
            const response = await axios.get('https://api.nexray.eu.cc/maker/fakelobyml', {
                params: {
                    avatar: avatar,
                    nickname: nickname
                },
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            const contentType = response.headers['content-type'] || 'image/png';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="fakelobyml_${nickname}.png"`);
            res.send(response.data);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal generate gambar fake lobby ML'
            });
        }
    });
};
