const axios = require('axios');

const getCreator = () => {
    return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

// Mapping judul Indonesia ke Inggris (biar search bisa pake bahasa Indonesia)
const indoToEng = {
    "perceraian di hari pernikahan": "just married just divorced",
    "diantar oleh takdir": "diantar oleh takdir",
    "virgin bride": "virgin bride bound to the dragon king",
    "pelayan": "the maid",
    "rahasia": "secret"
};

// Headers lengkap untuk bypass CloudFront
const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://www.dramabox.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'x-nextjs-data': '1'
};

class DramaBox {
    constructor() {
        this.buildId = "dramabox_prod_20260529";
        this.headers = headers;
    }

    // ==================== SEARCH (SESUAI DRAMABOX) ====================
    async search(query) {
        // Konversi ke bahasa Inggris jika perlu
        let searchQuery = query.toLowerCase();
        if (indoToEng[searchQuery]) {
            searchQuery = indoToEng[searchQuery];
        }
        
        try {
            const { data } = await axios.get(`https://www.dramabox.com/_next/data/${this.buildId}/in/search.json`, {
                params: { searchValue: searchQuery },
                headers: {
                    ...this.headers,
                    'Referer': `https://www.dramabox.com/in/search?searchValue=${encodeURIComponent(searchQuery)}`
                },
                timeout: 15000
            });

            const books = data?.pageProps?.bookList || [];
            return books.map(v => ({
                id: v.bookId,
                title: v.bookName,
                titleEn: v.bookNameEn,
                cover: v.coverWap,
                description: v.introduction,
                chapters: v.totalChapterNum,
                freeChapters: v.freeChapterNum,
                views: v.clickNum,
                rating: v.commentScore,
                url: `https://www.dramabox.com/in/drama/${v.bookId}/${v.bookNameEn}`
            }));
        } catch (err) {
            console.error('[Search Error]', err.message);
            return [];
        }
    }

    // ==================== DETAIL ====================
    async detail(bookId, slug) {
        try {
            const { data } = await axios.get(`https://www.dramabox.com/_next/data/${this.buildId}/in/drama/${bookId}/${slug}.json`, {
                params: { bookId, bookNameEn: slug },
                headers: {
                    ...this.headers,
                    'referer': `https://www.dramabox.com/in/drama/${bookId}/${slug}`
                },
                timeout: 15000
            });

            const book = data.pageProps.bookInfo;
            return {
                id: book.bookId,
                title: book.bookName,
                slug: book.bookNameEn,
                cover: book.cover,
                views: book.viewCount,
                followers: book.followCount,
                chapters: book.chapterCount,
                language: book.language,
                labels: book.labels,
                tags: book.tags,
                performers: book.performerList?.map(v => ({
                    id: v.performerId,
                    name: v.performerName,
                    avatar: v.performerAvatar
                })) || [],
                description: book.introduction,
                episodes: data.pageProps.chapterList.map(ch => ({
                    id: ch.id,
                    episode: ch.index + 1,
                    title: ch.name,
                    unlock: ch.unlock,
                    duration: ch.duration,
                    cover: ch.cover,
                    mp4: ch.mp4 || null,
                    m3u8: ch.m3u8Url || null
                }))
            };
        } catch (err) {
            console.error('[Detail Error]', err.message);
            return null;
        }
    }

    // ==================== GET STREAM URL ====================
    async getStreamUrl(bookId, episodeIndex) {
        try {
            const { data } = await axios.get(`https://www.dramabox.com/_next/data/${this.buildId}/in/drama/${bookId}/episode/${episodeIndex + 1}.json`, {
                headers: this.headers,
                timeout: 15000
            });
            
            return data.pageProps?.mp4 || data.pageProps?.m3u8Url || null;
        } catch (err) {
            console.error('[Stream Error]', err.message);
            return null;
        }
    }
}

const dramabox = new DramaBox();

module.exports = (app) => {
    
    // ==================== 1. SEARCH ====================
    app.get('/dramabox/search', async (req, res) => {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "q" diperlukan'
            });
        }
        
        try {
            const results = await dramabox.search(q);
            res.json({
                status: true,
                creator: getCreator(),
                query: q,
                total: results.length,
                results: results
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });
    
    // ==================== 2. DETAIL ====================
    app.get('/dramabox/detail', async (req, res) => {
        const { id, slug } = req.query;
        
        if (!id || !slug) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "id" dan "slug" diperlukan'
            });
        }
        
        try {
            const detail = await dramabox.detail(id, slug);
            if (!detail) {
                return res.status(404).json({ status: false, creator: getCreator(), error: 'Drama tidak ditemukan' });
            }
            res.json({
                status: true,
                creator: getCreator(),
                result: detail
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });
    
    // ==================== 3. VIDEO LANGSUNG ====================
    app.get('/dramabox/video', async (req, res) => {
        const { id, episode } = req.query;
        
        if (!id || !episode) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "id" dan "episode" diperlukan'
            });
        }
        
        try {
            const videoUrl = await dramabox.getStreamUrl(id, parseInt(episode) - 1);
            
            if (!videoUrl) {
                return res.status(404).json({
                    status: false,
                    creator: getCreator(),
                    error: 'Link video tidak ditemukan'
                });
            }
            
            const videoResponse = await axios.get(videoUrl, {
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.dramabox.com/'
                },
                timeout: 60000
            });
            
            res.setHeader('Content-Type', videoResponse.headers['content-type'] || 'video/mp4');
            res.setHeader('Content-Disposition', `inline; filename="drama_${id}_ep${episode}.mp4"`);
            videoResponse.data.pipe(res);
            
        } catch (error) {
            console.error('[Video Error]', error.message);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
