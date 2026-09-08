const axios = require('axios');
const cheerio = require('cheerio');

module.exports = (app) => {
    
    app.get('/anime/samehadaku/detail', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyDev',
                error: 'Parameter "url" diperlukan (URL detail anime Samehadaku)'
            });
        }
        
        try {
            console.log('[Detail] Anime URL:', url);
            
            // 1. Ambil halaman detail anime
            const { data } = await axios.get(url, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });
            
            const $ = cheerio.load(data);
            
            // ==================== DETAIL ANIME ====================
            const detail = {};
            
            // Ambil judul
            detail.title = $('h1.entry-title').text().trim();
            
            // Ambil gambar poster
            detail.poster = $('.thumb img').attr('src') || null;
            
            // Ambil info dari div .spe
            $('.spe span').each((i, el) => {
                const text = $(el).text().trim();
                if (text.includes('Japanese')) {
                    detail.japanese = text.replace('Japanese', '').trim();
                } else if (text.includes('English')) {
                    detail.english = text.replace('English', '').trim();
                } else if (text.includes('Status')) {
                    detail.status = text.replace('Status', '').trim();
                } else if (text.includes('Type')) {
                    detail.type = text.replace('Type', '').trim();
                } else if (text.includes('Source')) {
                    detail.source = text.replace('Source', '').trim();
                } else if (text.includes('Duration')) {
                    detail.duration = text.replace('Duration', '').trim();
                } else if (text.includes('Total Episode')) {
                    detail.total_episodes = text.replace('Total Episode', '').trim();
                } else if (text.includes('Season')) {
                    detail.season = text.replace('Season', '').trim();
                } else if (text.includes('Studio')) {
                    detail.studio = text.replace('Studio', '').trim();
                } else if (text.includes('Released')) {
                    detail.released = text.replace('Released:', '').trim();
                }
            });
            
            // Ambil sinopsis
            detail.sinopsis = $('.entry-content p').first().text().trim() || '';
            
            // Ambil genre
            const genres = [];
            $('.genres a, .genre a').each((i, el) => {
                genres.push($(el).text().trim());
            });
            detail.genres = genres;
            
            // ==================== DAFTAR EPISODE ====================
            const episodes = [];
            
            $('.lstepsiode.listeps ul li').each((i, el) => {
                const episodeNum = $(el).find('.eps a').text().trim();
                const episodeUrl = $(el).find('.eps a').attr('href');
                const title = $(el).find('.lchx a').text().trim();
                const date = $(el).find('.date').text().trim();
                
                if (episodeUrl) {
                    episodes.push({
                        number: episodeNum,
                        title: title,
                        url: episodeUrl,
                        date: date
                    });
                }
            });
            
            // Balik urutan (episode 1 di atas)
            episodes.reverse();
            
            // ==================== RESPONSE ====================
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    detail: detail,
                    total_episodes: episodes.length,
                    episodes: episodes
                }
            });
            
        } catch (error) {
            console.error('[Detail Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyDev',
                error: error.message
            });
        }
    });
};
