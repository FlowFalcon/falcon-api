const axios = require('axios');
const cheerio = require('cheerio');

async function searchSeries(keyword) {
    const url = `https://donghub.vip/?s=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const $ = cheerio.load(response.data);
    const results = [];
    const seen = new Set();

    $('.post-item, .bs-item, article, .item').each((i, el) => {
        const linkEl = $(el).find('a').first();
        const href = linkEl.attr('href');
        let title = linkEl.text().trim() || $(el).find('h3, .title, .entry-title').text().trim();
        const imgEl = $(el).find('img').first();
        let thumbnail = imgEl.attr('src') || imgEl.attr('data-src') || null;

        if (!href || !title) return;
        if (href.includes('/bookmark/') || href.includes('/schedule/') || href === '/') return;
        if (href.includes('/privacy-policy/')) return;

        title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (title.length < 3) return;
        if (seen.has(href)) return;
        seen.add(href);

        let tipe = 'Series';
        if (href.includes('/episode/')) tipe = 'Episode';
        else if (href.includes('/movie/')) tipe = 'Movie';

        if (!thumbnail) {
            thumbnail = `https://via.placeholder.com/200x300?text=${encodeURIComponent(title.slice(0, 20))}`;
        }

        results.push({ title, link: href, type: tipe, thumbnail });
    });

    return results.slice(0, 20);
}

async function searchEpisode(keyword) {
    // Extract nomor episode
    const episodeMatch = keyword.match(/episode\s*(\d+)/i);
    const targetEp = episodeMatch ? episodeMatch[1] : null;
    
    // Cari series name (hapus kata "episode xx")
    let seriesName = keyword.replace(/episode\s*\d+/i, '').trim();
    
    // Coba cari series
    let series = await searchSeries(seriesName);
    
    // Kalau gak ketemu, coba cari tanpa kata terakhir
    if (series.length === 0 && seriesName.includes(' ')) {
        const words = seriesName.split(' ');
        words.pop();
        seriesName = words.join(' ');
        series = await searchSeries(seriesName);
    }
    
    if (series.length === 0) return [];

    const seriesUrl = series[0].link;
    
    try {
        const response = await axios.get(seriesUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        const $ = cheerio.load(response.data);
        const episodes = [];

        // Cari semua link episode
        $('a[href*="/episode/"]').each((i, el) => {
            const href = $(el).attr('href');
            let title = $(el).text().trim();
            if (!href) return;
            
            title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            
            // Ekstrak nomor episode dari URL atau title
            let episodeNum = null;
            const urlMatch = href.match(/episode-(\d+)/i);
            const titleMatch = title.match(/Episode\s*(\d+)/i);
            if (urlMatch) episodeNum = urlMatch[1];
            if (titleMatch) episodeNum = titleMatch[1];
            
            // Filter berdasarkan nomor episode jika ada
            if (targetEp && episodeNum !== targetEp) return;
            
            episodes.push({
                title: title || `Episode ${episodeNum || '?'}`,
                link: href,
                type: 'Episode',
                episode: episodeNum,
                thumbnail: series[0].thumbnail
            });
        });

        // Urutkan berdasarkan nomor episode
        episodes.sort((a, b) => (parseInt(b.episode) || 0) - (parseInt(a.episode) || 0));
        
        return episodes;

    } catch (error) {
        return [];
    }
}

module.exports = (app) => {
    app.get('/search/donghua', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ status: false, error: 'Parameter "q" diperlukan' });
        }

        try {
            let results = [];
            const isEpisodeSearch = q.toLowerCase().includes('episode');

            if (isEpisodeSearch) {
                results = await searchEpisode(q);
            } else {
                results = await searchSeries(q);
            }

            // Fallback: kalau search episode gak ketemu, coba search series
            if (isEpisodeSearch && results.length === 0) {
                const seriesName = q.replace(/episode\s*\d+/i, '').trim();
                results = await searchSeries(seriesName);
                if (results.length > 0) {
                    return res.json({
                        status: true,
                        creator: 'AxlyChann',
                        result: {
                            query: q,
                            type: 'series_suggestion',
                            message: `Episode ${q.match(/episode\s*(\d+)/i)?.[1]} tidak ditemukan. Berikut series yang cocok:`,
                            total: results.length,
                            data: results
                        }
                    });
                }
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    query: q,
                    type: isEpisodeSearch ? 'episode' : 'series',
                    total: results.length,
                    data: results
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message || 'Gagal mencari' });
        }
    });
};
