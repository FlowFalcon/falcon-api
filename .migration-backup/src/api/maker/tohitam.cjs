const axios = require('axios');

const AGENT = 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36';

async function editImage(imageUrl, prompt) {
    // Primary: nanobanana
    try {
        const url = `https://axlyapi.qzz.io/ai/nanobanana?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': AGENT },
            timeout: 60000
        });
        if (res.status === 200 && res.data) {
            return Buffer.from(res.data);
        }
        throw new Error('nanobanana gagal');
    } catch (e) {
        console.log('[EditImage] Primary gagal, coba fallback:', e.message);
    }

    // Fallback: easemate
    try {
        const url = `https://axlyapi.qzz.io/ai/easemate?prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(imageUrl)}&raw=true`;
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': AGENT },
            timeout: 60000
        });
        if (res.status === 200 && res.data) {
            return Buffer.from(res.data);
        }
        throw new Error('easemate gagal');
    } catch (e) {
        throw new Error('Semua API gagal: ' + e.message);
    }
}

const getCreator = () => {
    return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {

    app.get('/maker/tohitam', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "url" diperlukan (URL gambar)'
            });
        }

        try {
            const prompt = "make the character's skin black, dark skin, black complexion, change skin tone to black";

            console.log('[ToHitam] Processing:', url);

            const resultBuffer = await editImage(url, prompt);

            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Disposition', `inline; filename="tohitam_${Date.now()}.jpg"`);
            res.send(resultBuffer);

        } catch (error) {
            console.error('[ToHitam Error]', error.message);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
