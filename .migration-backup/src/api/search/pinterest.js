const axios = require('axios');

async function searchPinterest(query, maxPins = 20) {
    try {
        const ip = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
        const userAgent = "Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36";

        // Request awal buat dapetin cookie
        const initResponse = await axios.get("https://au.pinterest.com/", {
            headers: {
                "x-forwarded-for": ip,
                "x-real-ip": ip,
                "User-Agent": userAgent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
            }
        });

        let cookieString = initResponse.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
        
        // Ambil CSRF token dari cookie
        const csrfMatch = cookieString.match(/csrftoken=([^;]+)/);
        const csrfToken = csrfMatch ? csrfMatch[1] : "";

        let allResults = [];
        let bookmark = "";

        while (allResults.length < maxPins) {
            const requestData = {
                options: {
                    query: query,
                    scope: "pins",
                    rs: "typed",
                    redux_normalize_feed: true
                },
                context: {}
            };

            if (bookmark) {
                requestData.options.bookmarks = [bookmark];
            }

            const targetUrl = `https://au.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${encodeURIComponent(query)}&data=${encodeURIComponent(JSON.stringify(requestData))}&_=${Date.now()}`;

            const searchResponse = await axios.get(targetUrl, {
                headers: {
                    "User-Agent": userAgent,
                    "Accept": "application/json, text/javascript, */*, q=0.01",
                    "x-requested-with": "XMLHttpRequest",
                    "x-pinterest-appstate": "active",
                    "x-pinterest-source-url": `/search/pins/?q=${encodeURIComponent(query)}`,
                    "x-pinterest-pws-handler": "www/search/[scope].js",
                    "X-CSRFToken": csrfToken,
                    "referer": "https://au.pinterest.com/",
                    "x-forwarded-for": ip,
                    "x-real-ip": ip,
                    "Cookie": cookieString
                }
            });

            const json = searchResponse.data;
            const rawResults = json.resource_response?.data?.results || [];

            const formattedData = rawResults.map(pin => {
                const images = pin.images || {};
                const bestImage = images["orig"] || images["736x"] || images["400x"];

                let totalReactions = 0;
                if (pin.reaction_counts) {
                    for (const key in pin.reaction_counts) {
                        totalReactions += pin.reaction_counts[key];
                    }
                }

                return {
                    id: pin.id,
                    title: pin.title || pin.grid_title || "Tanpa Judul",
                    description: pin.description?.trim() || pin.seo_alt_text || "",
                    image_url: bestImage?.url || null,
                    dominant_color: pin.dominant_color || "",
                    likes: totalReactions,
                    source_domain: pin.domain || "Unknown",
                    author: {
                        username: pin.pinner?.username || pin.native_creator?.username || "Tidak diketahui",
                        full_name: pin.pinner?.full_name || pin.native_creator?.full_name || "",
                        followers: pin.pinner?.follower_count || pin.native_creator?.follower_count || 0,
                        avatar_url: pin.pinner?.image_medium_url || ""
                    },
                    board: {
                        name: pin.board?.name || "",
                        url: pin.board?.url ? `https://pinterest.com${pin.board.url}` : "",
                        pin_count: pin.board?.pin_count || 0
                    }
                };
            }).filter(pin => pin.image_url !== null);

            allResults = allResults.concat(formattedData);
            bookmark = json.resource_response?.bookmark;

            if (!bookmark || bookmark === "-end-") {
                break;
            }
        }

        return allResults.slice(0, maxPins);

    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = (app) => {
    app.get('/search/pinterest', async (req, res) => {
        const { q, limit = 20 } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "q" diperlukan (kata kunci pencarian)'
            });
        }

        const maxPins = parseInt(limit) > 50 ? 50 : parseInt(limit) || 20;

        try {
            const results = await searchPinterest(q, maxPins);
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    query: q,
                    total: results.length,
                    data: results
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mencari di Pinterest'
            });
        }
    });
};
