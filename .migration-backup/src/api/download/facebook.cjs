const axios = require('axios');
const crypto = require('crypto');
const forge = require('node-forge');

const HITUBE_API = "https://api.hitube.io";
const HITUBE_WEB = "https://www.hitube.io";
const PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CPCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e2SuC+4EuVkaqzN08LQIDAQAB";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0";

function createSessionId() {
    const random = crypto.randomBytes(6).toString("base64url").slice(0, 10);
    return `hitube.io_${random}_${Date.now()}`;
}

function createSecureMessage() {
    const pem = `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
    const publicKey = forge.pki.publicKeyFromPem(pem);
    const encrypted = publicKey.encrypt(Date.now().toString(), "RSAES-PKCS1-V1_5");
    return forge.util.encode64(encrypted);
}

async function facebookDownloader(url) {
    const sessionid = createSessionId();
    
    try {
        const response = await axios.get(`${HITUBE_API}/st-tik-video/fb/dl`, {
            params: { url, sessionid },
            headers: {
                "x-secure-message": createSecureMessage(),
                "accept": "application/json, text/plain, */*",
                "origin": HITUBE_WEB,
                "referer": `${HITUBE_WEB}/`,
                "user-agent": UA
            },
            timeout: 30000
        });

        console.log('[Hitube] Response code:', response.data?.code);

        if (response.data?.code !== 200) {
            return {
                status: false,
                error: response.data?.msg || 'Gagal mengambil data dari hitube.io'
            };
        }

        const result = response.data?.result;
        const mediaList = result?.fbBos || [];
        
        if (mediaList.length === 0) {
            return {
                status: false,
                error: 'Tidak ada media yang ditemukan di URL ini'
            };
        }

        const videos = [];
        const images = [];
        const audios = [];

        for (const item of mediaList) {
            const mediaUrl = item.url ? `${HITUBE_API}/st-tik-video/token/${encodeURIComponent(item.url)}?sessionid=${sessionid}&wh=www.hitube.io` : null;
            
            if (!mediaUrl) continue;

            const itemType = item.type?.toLowerCase() || '';
            
            // Video: mp4, mov, avi, webm
            if (itemType === 'mp4' || itemType === 'video' || itemType === 'mov' || itemType === 'avi' || itemType === 'webm') {
                videos.push({
                    quality: item.tag || (itemType === 'mp4' ? 'SD' : 'Unknown'),
                    url: mediaUrl,
                    size: item.size || null
                });
            } 
            // Audio: m4a, mp3, aac, ogg
            else if (itemType === 'm4a' || itemType === 'mp3' || itemType === 'aac' || itemType === 'ogg' || itemType === 'audio') {
                audios.push({
                    quality: item.tag || 'Audio',
                    url: mediaUrl,
                    size: item.size || null,
                    type: item.type
                });
            }
            // Foto: jpg, jpeg, png, gif, webp, photo, image
            else if (itemType === 'jpg' || itemType === 'jpeg' || itemType === 'png' || itemType === 'gif' || itemType === 'webp' || itemType === 'photo' || itemType === 'image') {
                images.push({
                    url: mediaUrl,
                    size: item.size || null,
                    type: item.type
                });
            }
        }

        if (videos.length === 0 && images.length === 0 && audios.length === 0) {
            return {
                status: false,
                error: 'Tidak ada media yang dapat diekstrak (unknown type)'
            };
        }

        // Tentukan tipe utama
        let mainType = 'unknown';
        if (videos.length > 0) mainType = 'video';
        else if (images.length > 0) mainType = 'photo';
        else if (audios.length > 0) mainType = 'audio';

        // Ambil thumbnail
        let thumbnail = null;
        if (result?.fbCover) {
            thumbnail = `${HITUBE_API}/st-tik-video/token/${encodeURIComponent(result.fbCover)}?sessionid=${sessionid}&wh=www.hitube.io`;
        } else if (images.length > 0) {
            thumbnail = images[0].url;
        }

        return {
            status: true,
            type: mainType,
            title: result?.title || 'Facebook Media',
            thumbnail: thumbnail,
            videos: videos,
            images: images,
            audios: audios
        };

    } catch (error) {
        console.error('[Hitube Error]', error.message);
        return {
            status: false,
            error: error.message
        };
    }
}

module.exports = (app) => {
    app.get('/download/facebook', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyChann',
                error: 'Parameter "url" diperlukan (URL Facebook video/photo)'
            });
        }

        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyChann',
                error: 'URL harus dari Facebook (facebook.com atau fb.watch)'
            });
        }

        try {
            const result = await facebookDownloader(url);

            if (!result.status) {
                return res.status(400).json({
                    status: false,
                    creator: 'AxlyChann',
                    error: result.error
                });
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    type: result.type,
                    title: result.title,
                    thumbnail: result.thumbnail,
                    videos: result.videos,
                    images: result.images,
                    audios: result.audios
                }
            });

        } catch (error) {
            console.error('[Facebook API Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message || 'Gagal download Facebook media'
            });
        }
    });
};
