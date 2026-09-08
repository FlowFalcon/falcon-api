const axios = require('axios');
const crypto = require('crypto');

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0";
const SECRET = "376136387538459893883312310911992847112448894410210511297108";
const TOTP_VERSION = 61;
const APP_VERSION = "1.2.92.50.g97692e81";
const FALLBACK_HASHES = [
    "eff59fa0a3d026b88b56fddbcf4bdfa16a186b8175a5c1a358c072e053c2e5b0",
    "21b3fe49546912ba782db5c47e9ef5a7dbd20329520ba0c7d0fcfadee671d24e"
];

const BASE_HEADERS = {
    'Referer': 'https://open.spotify.com/',
    'Origin': 'https://open.spotify.com',
    'User-Agent': UA,
    'Accept-Language': 'en'
};

let session = { token: null, clientToken: null, expires: 0 };
let discoveredHash = null;

function generateTOTP(tsms) {
    const counter = Math.floor((tsms / 1000) / 30);
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', Buffer.from(SECRET, "utf8")).update(buffer);
    const digest = hmac.digest();
    const offset = digest[digest.length - 1] & 0xf;
    const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
    return code.toString().padStart(6, '0');
}

async function getAuth(force = false) {
    if (!force && session.token && Date.now() < session.expires - 60000) return session;
    
    const now = Date.now();
    
    const params = new URLSearchParams({
        reason: 'init',
        productType: 'web-player',
        totp: generateTOTP(now),
        totpServer: generateTOTP(now),
        totpVer: String(TOTP_VERSION)
    });
    
    const tokenRes = await axios.get(`https://open.spotify.com/api/token?${params}`, {
        headers: BASE_HEADERS
    });
    
    const tokenData = tokenRes.data;
    if (!tokenData.accessToken) throw new Error('Token request failed');
    
    const clientRes = await axios.post('https://clienttoken.spotify.com/v1/clienttoken', {
        client_data: {
            client_version: APP_VERSION,
            client_id: tokenData.clientId,
            js_sdk_data: {
                device_brand: 'unknown',
                device_model: 'unknown',
                os: 'windows',
                os_version: 'NT 10.0',
                device_id: crypto.randomUUID(),
                device_type: 'computer'
            }
        }
    }, {
        headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    
    const clientData = clientRes.data;
    if (!clientData.granted_token?.token) throw new Error('Client token request failed');
    
    session.token = tokenData.accessToken;
    session.clientToken = clientData.granted_token.token;
    session.expires = tokenData.accessTokenExpirationTimestampMs || (now + 3000000);
    
    return session;
}

async function discoverHash() {
    if (discoveredHash !== null) return discoveredHash || null;
    discoveredHash = "";
    
    try {
        const htmlRes = await axios.get('https://open.spotify.com/', {
            headers: { 'User-Agent': UA }
        });
        const html = htmlRes.data;
        
        const mainMatch = html.match(/https:\/\/open\.spotifycdn\.com\/cdn\/build\/web-player\/web-player\.[0-9a-f]+\.js/);
        if (!mainMatch) return null;
        
        const mainUrl = mainMatch[0];
        const mainJs = (await axios.get(mainUrl, {
            headers: { 'User-Agent': UA, 'Referer': 'https://open.spotify.com/' }
        })).data;
        
        const candidates = [...new Set(mainJs.matchAll(/https:\/\/open\.spotifycdn\.com\/cdn\/build\/web-player\/[\w.\-]*search[\w.\-]*\.js/g))].map(x => x[0]);
        
        for (const url of candidates) {
            const chunkJs = (await axios.get(url, {
                headers: { 'User-Agent': UA, 'Referer': 'https://open.spotify.com/' }
            })).data;
            
            const hashMatch = chunkJs.match(/"searchDesktop","query","([a-f0-9]{64})"/);
            if (hashMatch) {
                discoveredHash = hashMatch[1];
                break;
            }
        }
    } catch (error) {
        discoveredHash = "";
    }
    
    return discoveredHash || null;
}

function fmtDuration(ms) {
    const total = Math.floor((ms || 0) / 1000);
    return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
}

function parseTrack(data) {
    if (!data) return null;
    
    const sources = data.albumOfTrack?.coverArt?.sources || [];
    let thumb = null;
    for (const src of sources) {
        if (!thumb || (src.width || 0) > (thumb.width || 0)) thumb = src;
    }
    
    const id = (data.uri || "").split(":")[2] || null;
    const artists = (data.artists?.items || []).map(a => a.profile?.name).filter(Boolean);
    
    return {
        id: id,
        artist: artists.join(", "),
        title: data.name || null,
        duration: fmtDuration(data.duration?.totalMilliseconds || 0),
        thumb: thumb?.url || null,
        url: id ? `https://open.spotify.com/track/${id}` : null
    };
}

async function getPreview(trackId) {
    if (!trackId) return null;
    
    try {
        const htmlRes = await axios.get(`https://open.spotify.com/embed/track/${trackId}`, {
            headers: { 'User-Agent': UA }
        });
        const html = htmlRes.data;
        
        const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^]*?)<\/script>/);
        if (nextMatch) {
            const data = JSON.parse(nextMatch[1]);
            const previewUrl = data?.props?.pageProps?.state?.data?.entity?.audioPreview?.url;
            if (previewUrl) return previewUrl;
        }
        
        const previewMatch = html.match(/https:\/\/p\.scdn\.co\/mp3-preview\/[a-zA-Z0-9]+/);
        return previewMatch ? previewMatch[0] : null;
    } catch {
        return null;
    }
}

async function runQuery(term, hash, limit, auth) {
    const params = new URLSearchParams({
        operationName: "searchDesktop",
        variables: JSON.stringify({
            searchTerm: term,
            offset: 0,
            limit: limit,
            numberOfTopResults: 1,
            includeAudiobooks: false
        }),
        extensions: JSON.stringify({
            persistedQuery: { version: 1, sha256Hash: hash }
        })
    });
    
    const headers = {
        ...BASE_HEADERS,
        'Accept': 'application/json',
        'App-Platform': 'WebPlayer',
        'Authorization': `Bearer ${auth.token}`,
        'Client-Token': auth.clientToken,
        'Spotify-App-Version': APP_VERSION
    };
    
    const res = await axios.get(`https://api-partner.spotify.com/pathfinder/v1/query?${params}`, {
        headers: headers
    });
    
    return res;
}

async function searchData(term, limit) {
    let auth = await getAuth(false);
    
    const tryHashes = async (hashes) => {
        for (const hash of hashes) {
            if (!hash) continue;
            try {
                let res = await runQuery(term, hash, limit, auth);
                if (res.status === 401) {
                    auth = await getAuth(true);
                    res = await runQuery(term, hash, limit, auth);
                }
                const json = res.data;
                if (json?.data?.searchV2) return json.data.searchV2;
            } catch (e) {
                continue;
            }
        }
        return null;
    };
    
    const primary = discoveredHash ? [discoveredHash, ...FALLBACK_HASHES] : FALLBACK_HASHES;
    let data = await tryHashes(primary);
    
    if (!data) {
        const fresh = await discoverHash();
        if (fresh && !primary.includes(fresh)) {
            data = await tryHashes([fresh]);
        }
    }
    
    return data;
}

async function spotifySearch(searchTerm, limit = 50) {
    const term = String(searchTerm || "").trim();
    if (!term) return [];
    
    try {
        const data = await searchData(term, limit);
        if (!data) return [];
        
        const items = (data.tracksV2?.items || []).map(i => parseTrack(i.item?.data)).filter(Boolean);
        const previews = await Promise.all(items.map(t => getPreview(t.id)));
        
        return items.map((t, i) => ({
            artist: t.artist,
            title: t.title,
            duration: t.duration,
            thumb: t.thumb,
            url: t.url,
            preview_url: previews[i]
        }));
    } catch (error) {
        console.error('Spotify search error:', error.message);
        return [];
    }
}

const getCreator = () => {
    return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
    app.get('/search/spotify', async (req, res) => {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "q" diperlukan (contoh: ?q=trouble+is+a+friend)'
            });
        }
        
        try {
            const results = await spotifySearch(q);
            
            res.json({
                status: true,
                creator: getCreator(),
                query: q,
                total: results.length,
                results: results
            });
            
        } catch (error) {
            console.error('[Spotify Search Error]', error.message);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
