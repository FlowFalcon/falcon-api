const axios = require('axios');
const cheerio = require('cheerio');

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────
function getCurrentDay() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = new Date();
    const dayName = days[today.getDay()];
    
    // Mapping ke bahasa API
    const dayMap = {
        'Senin': 'monday',
        'Selasa': 'tuesday',
        'Rabu': 'wednesday',
        'Kamis': 'thursday',
        'Jumat': 'friday',
        'Sabtu': 'saturday',
        'Minggu': 'sunday'
    };
    
    return {
        name: dayName,
        code: dayMap[dayName]
    };
}

// ──────────────────────────────────────────────────────────────
// 1️⃣ SEARCH ANIME (DENGAN SELECTOR YANG BENAR)
// ──────────────────────────────────────────────────────────────
async function searchAnime(query) {
    try {
        const searchUrl = `https://v2.samehadaku.how/?s=${encodeURIComponent(query)}`;
        console.log('[Search] URL:', searchUrl);
        
        const { data } = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const results = [];
        
        // Selector untuk setiap anime di halaman search
        $('article.animpost, .animepost').each((i, el) => {
            // Ambil link dan title
            const link = $(el).find('.animposx > a').attr('href');
            const title = $(el).find('.data .title h2').text().trim();
            
            // Ambil gambar
            const image = $(el).find('.content-thumb img').attr('src');
            
            // Ambil type (TV, Movie, OVA, dll) - dari .content-thumb .type
            const type = $(el).find('.content-thumb .type').text().trim();
            
            // Ambil score - dari .content-thumb .score
            let score = $(el).find('.content-thumb .score').text().trim();
            score = score.replace(/[^0-9.]/g, ''); // Bersihkan jadi angka saja
            
            // Ambil status (Completed/Ongoing) - dari .data .type
            const status = $(el).find('.data .type').text().trim();
            
            // Ambil genre dari tooltip (opsional)
            const genres = [];
            $(el).find('.stooltip .genres .mta a').each((j, genreEl) => {
                genres.push($(genreEl).text().trim());
            });
            
            if (title && link) {
                results.push({
                    title: title,
                    url: link,
                    image: image || null,
                    type: type || '-',
                    score: score || '-',
                    status: status || '-',
                    genres: genres.slice(0, 5)
                });
            }
        });
        
        console.log('[Search] Found:', results.length);
        return results.slice(0, 20);
        
    } catch (error) {
        console.error('[Search Error]', error.message);
        return [];
    }
                        }

// ──────────────────────────────────────────────────────────────
// 2️⃣ GET LATEST ANIME
// ──────────────────────────────────────────────────────────────
async function getLatestAnime() {
    try {
        const url = 'https://v2.samehadaku.how/anime-terbaru/';
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const animes = [];
        
        $('#container a[href*="/anime/"]').each((i, el) => {
            const link = $(el).attr('href');
            let title = $(el).text().trim();
            
            if (title && link && title.length > 5 && title.length < 100 && link.includes('/anime/')) {
                const exists = animes.find(a => a.url === link);
                if (!exists) {
                    let episode = '-';
                    let parent = $(el).parent();
                    for (let j = 0; j < 5; j++) {
                        const text = parent.text();
                        const match = text.match(/Episode\s*(\d+)/i);
                        if (match) {
                            episode = `Episode ${match[1]}`;
                            break;
                        }
                        parent = parent.parent();
                    }
                    
                    animes.push({
                        title: title,
                        url: link,
                        episode: episode,
                        thumbnail: null
                    });
                }
            }
        });
        
        const unique = [];
        const seen = new Set();
        for (const item of animes) {
            if (!seen.has(item.url)) {
                seen.add(item.url);
                unique.push(item);
            }
        }
        
        return unique.slice(0, 20);
        
    } catch (error) {
        console.error('[Latest Error]', error.message);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────
// 3️⃣ GET SCHEDULE (BERDASARKAN HARI INI)
// ──────────────────────────────────────────────────────────────
async function getSchedule() {
    try {
        const currentDay = getCurrentDay();
        console.log('[Schedule] Hari ini:', currentDay.name, `(${currentDay.code})`);
        
        // Panggil API untuk hari ini
        const apiUrl = `https://v2.samehadaku.how/wp-json/custom/v1/all-schedule?day=${currentDay.code}&perpage=30`;
        
        const { data } = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const schedule = {
            day: currentDay.name,
            total: 0,
            anime: []
        };
        
        if (data && Array.isArray(data) && data.length > 0) {
            for (const item of data) {
                schedule.anime.push({
                    title: item.title || 'Unknown',
                    url: item.url || '#',
                    time: item.east_time || '-',
                    score: item.east_score || '-',
                    type: item.east_type || '-',
                    genre: item.genre || '-',
                    thumbnail: item.featured_img_src || null
                });
            }
            schedule.total = schedule.anime.length;
        } else {
            // Fallback: coba scrape dari halaman jadwal
            const htmlUrl = 'https://v2.samehadaku.how/jadwal-rilis/';
            const { data: htmlData } = await axios.get(htmlUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 15000
            });
            
            const $ = cheerio.load(htmlData);
            
            // Cari tombol untuk hari ini dan klik (simulasi)
            // Ambil dari data yang sudah ada di HTML
            $('.result-schedule .animepost').each((i, el) => {
                const title = $(el).find('.title').text().trim();
                const urlLink = $(el).find('a').attr('href');
                const time = $(el).find('.ltseps').text().replace(/[^0-9:]/g, '');
                const score = $(el).find('.score').text().replace(/[^0-9.]/g, '');
                const type = $(el).find('.type:first-child').text().trim();
                const genre = $(el).find('.type:last-child').text().trim();
                
                if (title && urlLink) {
                    schedule.anime.push({
                        title: title,
                        url: urlLink,
                        time: time || '-',
                        score: score || '-',
                        type: type || '-',
                        genre: genre || '-',
                        thumbnail: null
                    });
                }
            });
            schedule.total = schedule.anime.length;
        }
        
        console.log(`[Schedule] ${currentDay.name}:`, schedule.total, 'anime');
        
        return schedule;
        
    } catch (error) {
        console.error('[Schedule Error]', error.message);
        return {
            day: getCurrentDay().name,
            total: 0,
            anime: [],
            error: error.message,
            fallback_url: 'https://v2.samehadaku.how/jadwal-rilis/'
        };
    }
}

// ──────────────────────────────────────────────────────────────
// 4️⃣ GET STREAMING LINK
// ──────────────────────────────────────────────────────────────
async function getStreamingUrl(episodeUrl) {
    try {
        const { data } = await axios.get(episodeUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        let playerUrl = null;
        let downloadLinks = [];
        
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.includes('filedon') || src.includes('embed') || src.includes('player') || src.includes('drive') || src.includes('mp4'))) {
                playerUrl = src;
                return false;
            }
        });
        
        if (!playerUrl) {
            $('a[href*="filedon.co"], a[href*="doodstream"], a[href*="drive.google"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href) downloadLinks.push(href);
            });
            playerUrl = downloadLinks[0] || null;
        }
        
        const title = $('h1.entry-title').text().trim() || 'Episode';
        
        return {
            title: title,
            player_url: playerUrl,
            download_links: downloadLinks
        };
        
    } catch (error) {
        throw new Error(`Gagal ambil streaming: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────────
// EXPORT ENDPOINTS
// ──────────────────────────────────────────────────────────────
module.exports = (app) => {
    
    // ─── SEARCH ANIME ──────────────────────────────────────────
    app.get('/anime/samehadaku/search', async (req, res) => {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyChann',
                error: 'Parameter "q" diperlukan'
            });
        }
        
        try {
            const results = await searchAnime(q);
            res.json({
                status: results.length > 0,
                creator: 'AxlyChann',
                query: q,
                total: results.length,
                results: results
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyChann', error: error.message });
        }
    });
    
    // ─── LATEST ANIME ──────────────────────────────────────────
    app.get('/anime/samehadaku/latest', async (req, res) => {
        try {
            const results = await getLatestAnime();
            res.json({
                status: results.length > 0,
                creator: 'AxlyChann',
                total: results.length,
                results: results
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyChann', error: error.message });
        }
    });
    
    // ─── SCHEDULE (JADWAL HARI INI) ────────────────────────────
    app.get('/anime/samehadaku/schedule', async (req, res) => {
        try {
            const schedule = await getSchedule();
            res.json({
                status: schedule.anime.length > 0,
                creator: 'AxlyChann',
                result: schedule
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message,
                fallback_url: 'https://v2.samehadaku.how/jadwal-rilis/'
            });
        }
    });
};
