const axios = require('axios');
const cheerio = require('cheerio');
const PDFDocument = require('pdfkit');
const FormData = require('form-data');

const getCreator = () => {
    return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

const KOMIKU_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
};

const BASE_URL = 'https://komiku.org';
const API_URL = 'https://api.komiku.org';

// ==================== SEARCH ====================
async function searchKomik(keyword, page = 1) {
    try {
        const searchUrl = `${API_URL}/?post_type=manga&s=${encodeURIComponent(keyword)}&page=${page}`;
        const { data } = await axios.get(searchUrl, { headers: KOMIKU_HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        const results = [];
        
        $('.bge').each((i, el) => {
            const title = $(el).find('.kan h3').text().trim();
            const url = $(el).find('.bgei a').first().attr('href');
            const image = $(el).find('.bgei img').attr('src');
            const type = $(el).find('.tpe1_inf b').text().trim();
            const genre = $(el).find('.tpe1_inf').text().trim().replace(type, '').trim();
            const update = $(el).find('.kan p').text().trim();
            
            if (title) {
                results.push({
                    title,
                    url: url ? (url.startsWith('http') ? url : BASE_URL + url) : null,
                    image,
                    type,
                    genre,
                    update
                });
            }
        });
        
        return { status: true, results, total: results.length };
    } catch (error) {
        return { status: false, error: error.message };
    }
}

// ==================== DETAIL ====================
async function getDetail(url) {
    try {
        const { data } = await axios.get(url, { headers: KOMIKU_HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        
        const thumbnail = $('.ims img').attr('src');
        const judul = $('h1 span').text().trim();
        const judulAlternatif = $('.j2').text().trim();
        const tipe = $('.inftable td').eq(5).text().trim();
        const genre = [];
        $('.genre li a span').each((i, el) => { genre.push($(el).text().trim()); });
        const author = $('.inftable td').eq(11).text().trim();
        const status = $('.inftable td').eq(13).text().trim();
        const rating = $('.inftable td').eq(15).text().trim();
        const sinopsis = $('.desc').text().trim();
        
        const chapters = [];
        $('#Daftar_Chapter tbody tr').each((i, el) => {
            const chapterUrl = $(el).find('td.judulseries a').attr('href');
            const chapterTitle = $(el).find('td.judulseries a span').text().trim();
            const date = $(el).find('td.tanggalseries').text().trim();
            if (chapterUrl && chapterTitle) {
                chapters.push({ title: chapterTitle, url: BASE_URL + chapterUrl, date });
            }
        });
        
        return {
            status: true,
            thumbnail,
            title: judul,
            alternative_title: judulAlternatif,
            type: tipe,
            genres: genre,
            author,
            status,
            rating,
            synopsis: sinopsis,
            total_chapters: chapters.length,
            chapters: chapters.reverse()
        };
    } catch (error) {
        return { status: false, error: error.message };
    }
}

// ==================== CHAPTER IMAGES ====================
async function getChapterImages(chapterUrl) {
    try {
        const { data } = await axios.get(chapterUrl, { headers: KOMIKU_HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        
        const images = [];
        $('#Baca_Komik img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && !src.includes('lazy.jpg')) images.push(src);
        });
        
        const seriesTitle = $('.breadcrumb a').eq(1).text().trim();
        const chapterTitle = $('h1').first().text().trim();
        
        let chapterNumber = '';
        const chapterMatch = chapterTitle.match(/Chapter\s*(\d+)/i);
        if (chapterMatch) chapterNumber = chapterMatch[1];
        
        return {
            status: true,
            series: seriesTitle,
            chapter: chapterTitle,
            chapter_number: chapterNumber,
            total_pages: images.length,
            image_urls: images
        };
    } catch (error) {
        return { status: false, error: error.message };
    }
}

// ==================== CREATE PDF BUFFER ====================
async function createPDFBuffer(images) {
    const chunks = [];
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
    
    doc.on('data', chunk => chunks.push(chunk));
    const pdfPromise = new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
    
    for (const imgUrl of images) {
        try {
            const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', headers: KOMIKU_HEADERS });
            const imgBuffer = Buffer.from(imgRes.data);
            const imgBase64 = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
            doc.addPage();
            doc.image(imgBase64, 0, 0, { width: doc.page.width, height: doc.page.height });
        } catch (err) {
            console.error('Gagal ambil gambar:', err.message);
        }
    }
    
    doc.end();
    return await pdfPromise;
}

// ==================== UPLOAD TO HOSTING ====================
async function uploadToCatbox(fileBuffer, filename) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fileBuffer, { filename: filename });

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: { ...form.getHeaders() },
        timeout: 60000
    });

    const url = response.data.trim();
    if (url.startsWith('https://')) return url;
    throw new Error('Upload gagal');
}

// ==================== ENDPOINTS ====================
module.exports = (app) => {
    
    // 1. SEARCH (JSON)
    app.get('/komiku/search', async (req, res) => {
        const { q, page = 1 } = req.query;
        
        if (!q) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "q" diperlukan'
            });
        }
        
        const result = await searchKomik(q, parseInt(page));
        res.json({
            status: result.status,
            creator: getCreator(),
            query: q,
            page: parseInt(page),
            total: result.total,
            results: result.results || []
        });
    });
    
    // 2. DETAIL (JSON)
    app.get('/komiku/detail', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "url" diperlukan'
            });
        }
        
        const result = await getDetail(url);
        res.json({
            status: result.status,
            creator: getCreator(),
            result: result.status ? result : null,
            error: result.error
        });
    });
    
    // 3. CHAPTER IMAGES (JSON)
    app.get('/komiku/chapter', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "url" diperlukan'
            });
        }
        
        const result = await getChapterImages(url);
        res.json({
            status: result.status,
            creator: getCreator(),
            result: result.status ? result : null,
            error: result.error
        });
    });
    
    // 4. PDF LANGSUNG (RETURN FILE)
    app.get('/komiku/pdf', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "url" diperlukan'
            });
        }
        
        try {
            const chapterData = await getChapterImages(url);
            if (!chapterData.status) {
                throw new Error(chapterData.error);
            }
            
            if (chapterData.image_urls.length === 0) {
                throw new Error('Tidak ada gambar ditemukan');
            }
            
            const pdfBuffer = await createPDFBuffer(chapterData.image_urls);
            
            const filename = `${chapterData.series.replace(/[^a-z0-9]/gi, '_')}_${chapterData.chapter_number || 'chapter'}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.send(pdfBuffer);
            
        } catch (error) {
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
    
    // 5. PDF LINK (RETURN JSON DENGAN LINK DOWNLOAD)
    app.get('/komiku/pdf-link', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "url" diperlukan'
            });
        }
        
        try {
            const chapterData = await getChapterImages(url);
            if (!chapterData.status) {
                throw new Error(chapterData.error);
            }
            
            if (chapterData.image_urls.length === 0) {
                throw new Error('Tidak ada gambar ditemukan');
            }
            
            const pdfBuffer = await createPDFBuffer(chapterData.image_urls);
            
            const filename = `${chapterData.series.replace(/[^a-z0-9]/gi, '_')}_${chapterData.chapter_number || 'chapter'}.pdf`;
            const pdfUrl = await uploadToCatbox(pdfBuffer, filename);
            
            res.json({
                status: true,
                creator: getCreator(),
                result: {
                    title: chapterData.series,
                    chapter: chapterData.chapter,
                    chapter_number: chapterData.chapter_number,
                    total_pages: chapterData.total_pages,
                    pdf_url: pdfUrl,
                    note: 'Link PDF dapat di-download dan dibagikan'
                }
            });
            
        } catch (error) {
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
