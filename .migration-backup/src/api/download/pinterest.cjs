const axios = require('axios');

async function pinterestDownloader(url) {
    if (!url || (!url.includes('pin.it') && !url.includes('pinterest.com'))) {
        return {
            status: false,
            error: 'URL harus dari Pinterest (pin.it atau pinterest.com)'
        };
    }

    try {
        const response = await axios.get(`https://savepinmedia.com/php/api/api.php?url=${encodeURIComponent(url)}`, {
            headers: {
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 30000
        });

        const html = response.data;
        if (!html || !html.includes('button-download')) {
            throw new Error('Gagal mengambil data dari savepinmedia.com');
        }

        // Ambil author
        const authorMatch = html.match(/<span>Penulis:<a[^>]*>(.*?)<\/a><\/span>/);
        const author = authorMatch ? authorMatch[1].trim() : '-';

        // Ambil semua media ID
        const mediaIds = [...html.matchAll(/href="\/download\.php\?id=([^"]+)"/g)].map(m => m[1]);

        // Deteksi tipe (video atau image)
        const isVideo = html.includes('.mp4') || (html.includes('fa-file-video-o') && !html.includes('JPEG'));
        const type = isVideo ? 'video' : 'image';

        // Bangun URL download
        const mediaUrls = mediaIds.map(id => `https://savepinmedia.com/download.php?id=${id}`);

        return {
            status: true,
            type: type,
            author: author,
            media_urls: mediaUrls,
            original_url: url
        };

    } catch (e) {
        return {
            status: false,
            error: e.message
        };
    }
}

module.exports = (app) => {
    app.get('/download/pinterest', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL Pinterest)'
            });
        }

        try {
            const result = await pinterestDownloader(url);
            
            if (!result.status) {
                throw new Error(result.error);
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    type: result.type,
                    author: result.author,
                    media_urls: result.media_urls,
                    original_url: result.original_url
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download Pinterest'
            });
        }
    });
};
