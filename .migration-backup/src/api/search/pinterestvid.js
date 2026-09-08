const https = require('https');

let cachedCookie = null;
let cookieExpiry = 0;

function request(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Pinterest-AppState': 'active',
                ...headers
            },
            timeout: 15000
        };

        const req = https.get(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function getCookie() {
    if (cachedCookie && Date.now() < cookieExpiry) return cachedCookie;

    const { headers } = await request('https://www.pinterest.com/', { 'Accept': 'text/html' });
    const cookies = headers['set-cookie'] || [];
    const csrf = cookies.find(c => c.startsWith('csrftoken='));
    const sess = cookies.find(c => c.startsWith('_pinterest_sess='));

    if (csrf && sess) {
        cachedCookie = `${csrf.split(';')[0]}; ${sess.split(';')[0]}; _auth=1`;
        cookieExpiry = Date.now() + 10 * 60 * 1000;
        return cachedCookie;
    }
    return null;
}

async function searchVideo(keyword, limit = 10) {
    const cookie = await getCookie();
    if (!cookie) return [];

    const sourceUrl = `/search/pins/?q=${encodeURIComponent(keyword)}&rs=typed&scope=videos`;
    const data = encodeURIComponent(JSON.stringify({
        options: {
            query: keyword,
            scope: 'videos',
            page_size: limit,
            rs: 'typed',
            redux_normalize_feed: true
        },
        context: {}
    }));

    const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent(sourceUrl)}&data=${data}&_=${Date.now()}`;

    const { status, body } = await request(url, {
        'Cookie': cookie,
        'Referer': `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}&scope=videos`,
        'X-Pinterest-Source-Url': sourceUrl,
        'X-Pinterest-PWS-Handler': 'www/search/[scope].js'
    });

    if (status !== 200) return [];

    const json = JSON.parse(body);
    const pins = json?.resource_response?.data?.results || [];

    return pins.slice(0, limit).map(p => {
        const videos = p.videos?.video_list || {};
        const vkey = Object.keys(videos).find(k => k.includes('V_720') || k.includes('V_480')) || Object.keys(videos)[0];
        const vid = videos[vkey] || {};

        return {
            id: p.id,
            title: p.title || p.grid_title || '(no title)',
            video_url: vid.url || null,
            duration: vid.duration ? `${(vid.duration / 1000).toFixed(1)}s` : null,
            thumbnail: p.images?.['474x']?.url || p.images?.orig?.url || null,
            saves: p.save_count || 0,
            link: `https://www.pinterest.com/pin/${p.id}/`
        };
    });
}

module.exports = (app) => {
    app.get('/search/pinterest/video', async (req, res) => {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({ status: false, error: 'Parameter "q" diperlukan' });
        }

        try {
            const results = await searchVideo(q, Math.min(parseInt(limit) || 10, 30));
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    query: q,
                    total: results.length,
                    videos: results
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message || 'Gagal mencari video' });
        }
    });
};
