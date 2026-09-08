const axios = require('axios');
const crypto = require('crypto');

function generateCfToken() {
    return [
        '0',
        crypto.randomBytes(16).toString('hex'),
        crypto.randomBytes(32).toString('base64url'),
        crypto.randomBytes(64).toString('base64url'),
        crypto.randomBytes(32).toString('hex')
    ].join('.');
}

async function twitterDownloader(url) {
    try {
        const cfToken = generateCfToken();
        const sessionToken = crypto.randomBytes(16).toString('hex');

        const searchResponse = await axios.post('https://x2twitter.com/api/ajaxSearch', 
            new URLSearchParams({ q: url, lang: 'id', cftoken: cfToken }), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': 'https://x2twitter.com',
                    'Referer': 'https://x2twitter.com/id',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Cookie': `_session=${sessionToken}; lang=id`
                },
                timeout: 30000
            }
        );

        if (searchResponse.data.status !== 'ok') {
            throw new Error('Gagal mengambil data dari x2twitter');
        }

        const html = searchResponse.data.data;
        const thumbnail = (html.match(/<img\s+src="([^"]+)"/) || [])[1] || null;
        const duration = (html.match(/<p>(\d+:\d+)<\/p>/) || [])[1] || null;

        // Ambil semua token video
        const tokenMatches = [...html.matchAll(/href="https:\/\/dl\.snapcdn\.app\/get\?token=([^"]+)"/g)].map(m => m[1]);
        
        const videos = tokenMatches.map(token => {
            try {
                const payloadBase64 = token.split('.')[1];
                const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
                
                if (decoded.filename && /\.(jpg|jpeg|png)$/i.test(decoded.filename)) return null;
                
                let resolution = 'unknown';
                if (decoded.filename) {
                    const match = decoded.filename.match(/_(\d+x\d+|\d+p)/i);
                    if (match) resolution = match[1];
                }
                
                return {
                    resolution: resolution,
                    url: `https://dl.snapcdn.app/get?token=${token}`
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        // Hapus duplikat berdasarkan URL
        const uniqueVideos = [];
        const seenUrls = new Set();
        for (const video of videos) {
            if (!seenUrls.has(video.url)) {
                seenUrls.add(video.url);
                uniqueVideos.push(video);
            }
        }

        // Cari audio
        let audio = null;
        const audioUrl = (html.match(/data-audioUrl="([^"]+)"/) || [])[1];
        const mediaId = (html.match(/data-mediaId="([^"]+)"/) || [])[1];
        const hostConvert = (html.match(/k_url_convert\s*=\s*"([^"]+)"/) || [])[1] || 'https://s1.twcdn.net/api/json/convert';
        const exp = (html.match(/k_exp\s*=\s*"([^"]+)"/) || [])[1];
        const token = (html.match(/k_token\s*=\s*"([^"]+)"/) || [])[1];

        if (audioUrl && mediaId && exp && token) {
            try {
                const convertResponse = await axios.post(hostConvert, 
                    new URLSearchParams({
                        ftype: 'mp3',
                        v_id: mediaId,
                        audioUrl: audioUrl,
                        audioType: 'video/mp4',
                        fquality: '128',
                        fname: 'X2Twitter.com',
                        exp: exp,
                        token: token
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        timeout: 30000
                    }
                );

                if (convertResponse.data && convertResponse.data.status === 'success') {
                    audio = {
                        url: convertResponse.data.result,
                        quality: '128kbps'
                    };
                }
            } catch (err) {
                console.log('Audio conversion failed:', err.message);
            }
        }

        return {
            status: true,
            thumbnail: thumbnail,
            duration: duration,
            videos: uniqueVideos,
            audio: audio
        };

    } catch (e) {
        return { status: false, error: e.message };
    }
}

module.exports = (app) => {
    app.get('/download/twitter', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL Twitter/X)'
            });
        }

        try {
            const result = await twitterDownloader(url);
            
            if (!result.status) {
                throw new Error(result.error);
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    thumbnail: result.thumbnail,
                    duration: result.duration,
                    videos: result.videos,
                    audio: result.audio
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download Twitter video'
            });
        }
    });
};
