const axios = require('axios');
const qs = require('qs');

async function igDownload(url) {
    try {
        const { data: res } = await axios.post('https://savereels.io/api/ajaxSearch', 
            qs.stringify({ q: url, v: 'v2' }), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
                },
                timeout: 30000
            }
        );

        if (res.status !== 'ok') throw new Error('Gagal fetch dari savereels.io');

        // Ambil semua link download
        const links = [...res.data.matchAll(/href="(https:\/\/dl\.snapcdn\.app\/get\?token=[^"]+)"/g)]
                      .map(m => m[1]);

        // Hapus duplikat
        const uniqueLinks = [...new Set(links)];
        
        // Pisahkan video dan thumbnail
        const videoUrl = uniqueLinks.find(link => link.includes('&type=video')) || uniqueLinks[0];
        const thumbnail = uniqueLinks.find(link => link.includes('&type=thumbnail')) || null;

        return {
            status: true,
            video_url: videoUrl || null,
            thumbnail: thumbnail || null,
            all_links: uniqueLinks
        };
    } catch (e) {
        return { status: false, error: e.message };
    }
}

module.exports = (app) => {
    app.get('/download/igdl', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL Instagram)'
            });
        }

        try {
            const result = await igDownload(url);
            
            if (!result.status) {
                throw new Error(result.error);
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    video_url: result.video_url,
                    thumbnail: result.thumbnail,
                    all_download_links: result.all_links
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download Instagram'
            });
        }
    });
};
