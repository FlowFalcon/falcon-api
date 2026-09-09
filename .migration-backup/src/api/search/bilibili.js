const axios = require('axios');

async function searchBilibili(query) {
    const USER_AGENT = 'Mozilla/5.0 (Linux; Android 16; Infinix X6837) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36';

    try {
        // Dapatkan fingerprint buat cookie
        const spiResponse = await axios.get('https://api.bilibili.com/x/frontend/finger/spi', {
            headers: {
                'User-Agent': USER_AGENT,
                'Origin': 'https://www.bilibili.tv',
                'Referer': 'https://www.bilibili.tv/id'
            }
        });

        const spiData = spiResponse.data;
        const dynamicCookie = `buvid3=${spiData.data.b_3}; buvid4=${encodeURIComponent(spiData.data.b_4)}; bstar-web-lang=id; bsource=search_google`;

        // Search URL
        const searchUrl = `https://www.bilibili.tv/id/search-result?q=${encodeURIComponent(query)}`;
        const searchResponse = await axios.get(searchUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Cookie': dynamicCookie,
                'Referer': 'https://www.bilibili.tv/id'
            }
        });

        const rawHtml = searchResponse.data;

        // Ambil initialState dari HTML
        const stateMatch = rawHtml.match(/window\.__initialState\s*=\s*([\s\S]*?);?<\/script>/);
        if (!stateMatch) throw new Error("Data initialState tidak ditemukan di HTML");

        // Parse JSON (hati-hati dengan karakter khusus)
        let stateData;
        try {
            stateData = new Function(`return ${stateMatch[1]}`)();
        } catch (e) {
            throw new Error("Gagal parsing initialState");
        }

        let videoResults = [];

        if (stateData.searchAll && stateData.searchAll.allList) {
            stateData.searchAll.allList.forEach(group => {
                if (!group.items) return;

                group.items.forEach(item => {
                    if (group.type === 'ogv') {
                        // Official Anime / Series
                        const playId = item.season_id || item.epId || item.season || '';
                        videoResults.push({
                            type: 'Official Anime',
                            id: playId,
                            title: item.title,
                            duration: 'Series/Episode',
                            views: item.view || '-',
                            cover_url: item.cover,
                            video_url: `https://www.bilibili.tv/id/play/${playId}`,
                            author: {
                                user_id: "official",
                                username: "Bstation Official",
                                avatar_url: null
                            }
                        });
                    } else if (group.type === 'ugc') {
                        // User Generated Content
                        videoResults.push({
                            type: 'User Video',
                            id: item.aid,
                            title: item.title,
                            duration: item.duration || '-',
                            views: item.view || '-',
                            cover_url: item.cover,
                            video_url: `https://www.bilibili.tv/id/video/${item.aid}`,
                            author: {
                                user_id: item.author?.mid || null,
                                username: item.author?.nickname || "Unknown",
                                avatar_url: item.author?.avatar || null
                            }
                        });
                    }
                });
            });
        }

        return {
            success: true,
            total_results: videoResults.length,
            data: videoResults
        };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = (app) => {
    app.get('/search/bilibili', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "q" diperlukan (kata kunci pencarian)'
            });
        }

        try {
            const result = await searchBilibili(q);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    query: q,
                    total: result.total_results,
                    data: result.data
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mencari di Bilibili'
            });
        }
    });
};
