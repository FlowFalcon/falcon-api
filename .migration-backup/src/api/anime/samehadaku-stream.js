const axios = require('axios');
const cheerio = require('cheerio');

module.exports = (app) => {
    
    app.get('/anime/samehadaku/stream', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyDev',
                error: 'Parameter "url" diperlukan (URL episode Samehadaku)'
            });
        }
        
        try {
            console.log('[Stream] Episode URL:', url);
            
            // 1. Ambil halaman episode
            const { data } = await axios.get(url, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });
            
            const $ = cheerio.load(data);
            const sources = [];
            
            // 2. Cari semua link download / player
            $('a[href*="blogger.com/video"], a[href*="wibufile.com"], a[href*="mega.nz"], a[href*="filedon.co"], a[href*="pixeldrain.com"]').each((i, el) => {
                let urlSource = $(el).attr('href');
                let name = $(el).text().trim();
                
                if (!urlSource) return;
                
                // Bersihkan nama
                if (!name || name.length === 0 || name === 'Link') {
                    if (urlSource.includes('blogger')) name = 'Blogspot 360p';
                    else if (urlSource.includes('wibufile')) {
                        if (urlSource.includes('FULLHD')) name = 'Wibufile 1080p';
                        else if (urlSource.includes('MP4HD')) name = 'Wibufile 720p';
                        else if (urlSource.includes('.mp4')) name = 'Wibufile 480p';
                        else name = 'Wibufile';
                    }
                    else if (urlSource.includes('mega.nz')) {
                        if (urlSource.includes('FULLHD')) name = 'Mega 1080p';
                        else if (urlSource.includes('MP4HD')) name = 'Mega 720p';
                        else name = 'Mega 480p';
                    }
                    else if (urlSource.includes('pixeldrain.com')) {
                        const match = urlSource.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
                        if (match) {
                            urlSource = `https://pixeldrain.com/api/file/${match[1]}`;
                            name = 'Pixeldrain';
                        }
                    }
                    else if (urlSource.includes('filedon.co')) {
                        if (urlSource.includes('FULLHD')) name = 'Pucuk 1080p';
                        else if (urlSource.includes('MP4HD')) name = 'Pucuk 720p';
                        else name = 'Pucuk 480p';
                    }
                    else {
                        name = 'Unknown Source';
                    }
                }
                
                // Konversi ke embed URL untuk filedon
                let iframeUrl = urlSource;
                if (urlSource.includes('/view/')) {
                    iframeUrl = urlSource.replace('/view/', '/embed/');
                }
                if (urlSource.includes('mega.nz/#!')) {
                    iframeUrl = urlSource.replace('#!', '/embed');
                }
                
                sources.push({
                    name: name,
                    url: iframeUrl
                });
            });
            
            // 3. Cari dari iframe (fallback)
            if (sources.length === 0) {
                $('iframe[src*="blogger"], iframe[src*="wibufile"], iframe[src*="mega"], iframe[src*="filedon"]').each((i, el) => {
                    let iframeUrl = $(el).attr('src');
                    let name = `Source ${i + 1}`;
                    
                    if (iframeUrl.includes('blogger')) name = 'Blogspot';
                    else if (iframeUrl.includes('wibufile')) name = 'Wibufile';
                    else if (iframeUrl.includes('mega')) name = 'Mega';
                    else if (iframeUrl.includes('filedon')) name = 'Pucuk';
                    
                    sources.push({ name, url: iframeUrl });
                });
            }
            
            // 4. Response langsung array
            if (sources.length === 0) {
                return res.json({
                    status: false,
                    creator: 'AxlyDev',
                    error: 'Tidak ada sumber video ditemukan',
                    a: []
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                a: sources
            });
            
        } catch (error) {
            console.error('[Stream Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyDev',
                error: error.message,
                a: []
            });
        }
    });
};
