// softkomik.js - Scraper Softkomik.co (pake judul, gak perlu slug)
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
    baseUrl: 'https://softkomik.co',
    apiUrl: 'https://v2.softdevices.my.id',
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
};

// Headers untuk gambar
const imageHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    'Referer': 'https://softkomik.co/',
    'Origin': 'https://softkomik.co'
};

// ========== HELPER FUNCTIONS ==========
function getTypeIcon(type) {
    if (type === 'manga') return '🇯🇵 Manga';
    if (type === 'manhwa') return '🇰🇷 Manhwa';
    if (type === 'manhua') return '🇨🇳 Manhua';
    return '📖 Unknown';
}

function getStatusText(status) {
    return status === 'ongoing' ? 'Ongoing 🟢' : 'Completed 🔴';
}

// ========== SEARCH KOMIK (PAKE JUDUL) ==========
async function searchKomik(query, limit = 20) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `${CONFIG.apiUrl}/search?name=${encodedQuery}`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Origin': 'https://softkomik.co',
                'Referer': 'https://softkomik.co/'
            },
            timeout: 10000
        });
        
        if (!response.data || !response.data.data) {
            return [];
        }
        
        const results = response.data.data.slice(0, limit).map(item => ({
            title: item.title,
            slug: item.title_slug,
            type: 'unknown',
            type_name: '📖 Unknown',
            status: 'unknown',
            status_text: 'Unknown',
            latest_chapter: '-',
            cover_url: null
        }));
        
        return results;
        
    } catch (error) {
        console.error('Search API error:', error.message);
        return [];
    }
}

// ========== GET DETAIL PAKE JUDUL (LANGSUNG, GAK PAKE SLUG) ==========
async function getKomikByTitle(title) {
    // Step 1: Search dulu pake judul
    const searchResults = await searchKomik(title, 1);
    
    if (searchResults.length === 0) {
        throw new Error(`Komik dengan judul "${title}" tidak ditemukan`);
    }
    
    const slug = searchResults[0].slug;
    
    // Step 2: Ambil detail dari slug
    const url = `${CONFIG.baseUrl}/${slug}`;
    const response = await axios.get(url, {
        headers: { 'User-Agent': CONFIG.userAgent },
        timeout: CONFIG.timeout
    });
    
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match || !match[1]) throw new Error('Data tidak ditemukan');
    
    const jsonData = JSON.parse(match[1]);
    const data = jsonData.props?.pageProps?.data;
    if (!data) throw new Error('Komik tidak ditemukan');
    
    return {
        title: data.title || '-',
        title_alt: data.title_alt || '-',
        slug: slug,
        type: data.type,
        type_name: getTypeIcon(data.type),
        status: data.status,
        status_text: getStatusText(data.status),
        author: data.author || '-',
        genres: data.Genre || [],
        sinopsis: data.sinopsis?.trim() || 'Tidak ada sinopsis',
        latest_chapter: data.latest_chapter || '-',
        total_chapters: data.chapter?.length || 0,
        updated_at: data.updated_at,
        cover_url: data.cover
    };
}

// ========== GET CHAPTERS PAKE JUDUL ==========
async function getChaptersByTitle(title, limit = 100) {
    const searchResults = await searchKomik(title, 1);
    if (searchResults.length === 0) {
        throw new Error(`Komik dengan judul "${title}" tidak ditemukan`);
    }
    
    const slug = searchResults[0].slug;
    const url = `${CONFIG.baseUrl}/${slug}`;
    const response = await axios.get(url, {
        headers: { 'User-Agent': CONFIG.userAgent },
        timeout: CONFIG.timeout
    });
    
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match || !match[1]) throw new Error('Data tidak ditemukan');
    
    const jsonData = JSON.parse(match[1]);
    const data = jsonData.props?.pageProps?.data;
    if (!data?.chapter) return [];
    
    const chapters = [...data.chapter].reverse();
    return chapters.slice(0, limit).map(ch => ({
        chapter: ch.chapter,
        url: `${CONFIG.baseUrl}/${slug}/chapter/${ch.chapter}`
    }));
}

// ========== GET IMAGES PAKE JUDUL ==========
async function getImagesByTitle(title, chapterNum, maxPage = 100) {
    const searchResults = await searchKomik(title, 1);
    if (searchResults.length === 0) {
        throw new Error(`Komik dengan judul "${title}" tidak ditemukan`);
    }
    
    const slug = searchResults[0].slug;
    const cleanChapter = String(parseInt(chapterNum)).padStart(3, '0');
    const domain = 'https://psy1.komik.im';
    const images = [];
    
    for (let page = 1; page <= maxPage; page++) {
        images.push({
            url: `${domain}/NodeJs/new-nodeJs/${slug}/chapter-${cleanChapter}/softkomik-${page}.webp`,
            page: page
        });
    }
    
    return {
        total: images.length,
        images: images,
        title: searchResults[0].title,
        chapter: chapterNum,
        note: 'URL di-generate berdasarkan pola. Beberapa URL mungkin 404 jika chapter lebih pendek.'
    };
}

// ========== LATEST (TETAP) ==========
async function getLatestKomik(limit = 20) {
    const response = await axios.get(CONFIG.baseUrl, {
        headers: { 'User-Agent': CONFIG.userAgent }
    });
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match || !match[1]) throw new Error('__NEXT_DATA__ tidak ditemukan');
    
    const jsonData = JSON.parse(match[1]);
    const data = jsonData.props?.pageProps?.data;
    if (!data) throw new Error('Gagal mengambil data');
    
    return {
        newKomik: (data.newKomik || []).slice(0, limit),
        updateKomik: (data.updateNonProject || []).slice(0, limit)
    };
}

// ========== REKOMENDASI ==========
async function getRekomendasi(limit = 15) {
    const response = await axios.get(CONFIG.baseUrl, {
        headers: { 'User-Agent': CONFIG.userAgent }
    });
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match || !match[1]) throw new Error('__NEXT_DATA__ tidak ditemukan');
    
    const jsonData = JSON.parse(match[1]);
    const data = jsonData.props?.pageProps?.data;
    if (!data) throw new Error('Gagal mengambil data');
    
    const allKomik = [...(data.newKomik || []), ...(data.updateNonProject || [])];
    const unique = [];
    const seen = new Set();
    for (const komik of allKomik) {
        if (komik.title_slug && !seen.has(komik.title_slug)) {
            seen.add(komik.title_slug);
            unique.push(komik);
        }
    }
    // Acak
    for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    return unique.slice(0, limit);
}

// ========== PROXY GAMBAR ==========
async function proxyImage(imageUrl) {
    const response = await axios.get(imageUrl, {
        headers: imageHeaders,
        responseType: 'stream',
        timeout: 30000
    });
    return response;
}

// ========== EXPRESS ENDPOINT ==========
module.exports = (app) => {
    
    // 1. LATEST KOMIK
    app.get('/anime/komik/latest', async (req, res) => {
        try {
            const { limit = 20 } = req.query;
            const data = await getLatestKomik(parseInt(limit));
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    new_komik: data.newKomik.map(k => ({
                        title: k.title,
                        type: k.type,
                        type_name: getTypeIcon(k.type),
                        status: k.status,
                        status_text: getStatusText(k.status),
                        latest_chapter: k.latest_chapter,
                        cover_url: k.cover
                    })),
                    update_komik: data.updateKomik.map(k => ({
                        title: k.title,
                        type: k.type,
                        type_name: getTypeIcon(k.type),
                        status: k.status,
                        status_text: getStatusText(k.status),
                        latest_chapter: k.latest_chapter,
                        updated_by: k.di_update_nama,
                        cover_url: k.cover
                    }))
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 2. SEARCH & DETAIL (GABUNG, PAKE JUDUL)
    app.get('/anime/komik/search', async (req, res) => {
        try {
            const { q } = req.query;
            
            if (!q) {
                return res.status(400).json({ 
                    status: false, 
                    creator: 'AxlyDev', 
                    error: 'Parameter q (judul komik) wajib diisi' 
                });
            }
            
            // Langsung dapetin detail dari judul
            const detail = await getKomikByTitle(q);
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: detail
            });
            
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                creator: 'AxlyDev', 
                error: error.message 
            });
        }
    });
    
    // 3. CHAPTERS (PAKE JUDUL)
    app.get('/anime/komik/chapters', async (req, res) => {
        try {
            const { title, limit = 100 } = req.query;
            
            if (!title) {
                return res.status(400).json({ 
                    status: false, 
                    creator: 'AxlyDev', 
                    error: 'Parameter title (judul komik) wajib diisi' 
                });
            }
            
            const chapters = await getChaptersByTitle(title, parseInt(limit));
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    title: title,
                    total: chapters.length,
                    chapters: chapters
                }
            });
            
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                creator: 'AxlyDev', 
                error: error.message 
            });
        }
    });
    
    // 4. IMAGES (PAKE JUDUL)
    app.get('/anime/komik/images', async (req, res) => {
        try {
            const { title, chapter, maxPage = 100 } = req.query;
            
            if (!title || !chapter) {
                return res.status(400).json({ 
                    status: false, 
                    creator: 'AxlyDev', 
                    error: 'Parameter title (judul) dan chapter wajib diisi' 
                });
            }
            
            const images = await getImagesByTitle(title, chapter, parseInt(maxPage));
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: images
            });
            
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                creator: 'AxlyDev', 
                error: error.message 
            });
        }
    });
    
    // 5. REKOMENDASI
    app.get('/anime/komik/rekomendasi', async (req, res) => {
        try {
            const { limit = 15 } = req.query;
            const rekom = await getRekomendasi(parseInt(limit));
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: rekom.map(k => ({
                    title: k.title,
                    type: k.type,
                    type_name: getTypeIcon(k.type),
                    status: k.status,
                    status_text: getStatusText(k.status),
                    latest_chapter: k.latest_chapter,
                    cover_url: k.cover
                }))
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 6. PROXY GAMBAR (opsional)
    app.get('/anime/komik/proxy', async (req, res) => {
        try {
            const { url } = req.query;
            if (!url || !url.includes('komik.im')) {
                return res.status(400).json({ 
                    status: false, 
                    creator: 'AxlyDev', 
                    error: 'Parameter url valid wajib diisi' 
                });
            }
            
            const response = await proxyImage(url);
            res.setHeader('Content-Type', response.headers['content-type']);
            response.data.pipe(res);
            
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                creator: 'AxlyDev', 
                error: error.message 
            });
        }
    });
    
};
