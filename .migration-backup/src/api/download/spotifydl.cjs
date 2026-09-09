const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

const BASE = "https://spotmate.online";
const UA = "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/137 Mobile Safari/537.36";

const jar = new CookieJar();
const client = wrapper(
    axios.create({
        jar,
        withCredentials: true,
        headers: {
            "user-agent": UA,
            accept: "*/*"
        },
        timeout: 30000
    })
);

async function getXsrf() {
    await client.get(`${BASE}/en1`);
    const cookies = await jar.getCookies(BASE);
    const xsrf = cookies.find(c => c.key === "XSRF-TOKEN");
    if (!xsrf) throw new Error("XSRF-TOKEN not found");
    return decodeURIComponent(xsrf.value);
}

async function convertSpotify(url) {
    const xsrf = await getXsrf();

    const trackRes = await client.post(
        `${BASE}/getTrackData`,
        { spotify_url: url },
        {
            headers: {
                "content-type": "application/json",
                "x-xsrf-token": xsrf,
                origin: BASE,
                referer: `${BASE}/en1`
            }
        }
    );

    const convertRes = await client.post(
        `${BASE}/convert`,
        { urls: url },
        {
            headers: {
                "content-type": "application/json",
                "x-xsrf-token": xsrf,
                origin: BASE,
                referer: `${BASE}/en1`
            }
        }
    );

    const t = trackRes.data;
    const d = convertRes.data;

    return {
        id: t.id,
        title: t.name,
        artist: t.artists.map(a => a.name).join(", "),
        duration: `${Math.floor(t.duration_ms / 60000)}:${String(Math.floor((t.duration_ms % 60000) / 1000)).padStart(2, "0")}`,
        explicit: t.explicit,
        thumbnail: t.album.images?.[0]?.url || null,
        spotify_url: t.external_urls.spotify,
        download_url: d.url
    };
}

module.exports = (app) => {
    app.get('/download/spotifydl', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL Spotify)'
            });
        }

        if (!url.includes('spotify.com/track/')) {
            return res.status(400).json({
                status: false,
                error: 'URL harus berupa link track Spotify'
            });
        }

        try {
            const result = await convertSpotify(url);
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download lagu'
            });
        }
    });
};
