const axios = require('axios');

module.exports = (app) => {
    app.get('/tools/ssweb', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ status: false, error: 'Parameter "url" diperlukan' });
        }

        try {
            const encodedUrl = encodeURIComponent(url);
            const apiUrl = `https://api.microlink.io/?url=${encodedUrl}&meta=false&screenshot.type=png&screenshot.fullPage=false&viewport.width=1920&viewport.height=1080&adblock=true&force=false`;

            const response = await axios.get(apiUrl, { timeout: 30000 });

            if (response.data?.status === 'success' && response.data?.data?.screenshot?.url) {
                // Redirect langsung ke gambar
                return res.redirect(response.data.data.screenshot.url);
            } else {
                throw new Error('Gagal mengambil screenshot');
            }
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
