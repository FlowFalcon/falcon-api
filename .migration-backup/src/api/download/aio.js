const axios = require('axios');
const crypto = require('crypto');

class J2Downloader {
    constructor() {
        this.baseUrl = 'https://j2download.com';
        this.userAgent = 'Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.135 Mobile Safari/537.36';
    }
    
    getRandomIp() {
        const r = () => Math.floor(Math.random() * 254) + 1;
        return `${r()}.${r()}.${r()}.${r()}`;
    }

    hasLeadingZeroNibbles(bytes, difficulty) {
        const fullBytes = Math.floor(difficulty / 2);
        const hasHalfByte = (difficulty & 1) === 1;
        for (let i = 0; i < fullBytes; i++) {
            if (bytes[i] !== 0) return false;
        }
        return !(hasHalfByte && (bytes[fullBytes] & 0xF0) !== 0);
    }

    deriveAltChallenge(challenge, nonce, solution) {
        const text = `pow:alt:${challenge}:${nonce}:${solution}`;
        return crypto.createHash('sha256').update(text).digest('hex');
    }

    solveSinglePow(challengeType, challenge, nonce, difficulty) {
        const prefix = challengeType === 'alt' ? `pow:${nonce}:` : `pow:${challenge}:`;
        const suffix = challengeType === 'alt' ? `:${challenge}` : `:${nonce}:${challenge.length}`;
        for (let n = 0; n < 100000000; n++) {
            const text = prefix + n + suffix;
            const hash = crypto.createHash('sha256').update(text).digest();
            if (this.hasLeadingZeroNibbles(hash, difficulty)) return String(n);
        }
        return null;
    }

    generatePowSolution(challenge, nonce, difficulty, challengeType = 'classic') {
        const first = this.solveSinglePow(challengeType, challenge, nonce, difficulty);
        if (!first) return null;
        if (challengeType !== 'alt') return first;
        const secondChallenge = this.deriveAltChallenge(challenge, nonce, first);
        const second = this.solveSinglePow(challengeType, secondChallenge, nonce, difficulty);
        return second ? `${first}.${second}` : null;
    }

    async autoGetJwtAndSession(ip) {
        const homeRes = await axios.get(`${this.baseUrl}/id`, {
            headers: { 
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });

        // PERBAIKAN: handle set-cookie yang bisa berupa array
        let rawSetCookie = homeRes.headers['set-cookie'];
        if (Array.isArray(rawSetCookie)) {
            rawSetCookie = rawSetCookie.join('; ');
        }
        if (!rawSetCookie) rawSetCookie = '';
        
        const sessionMatch = rawSetCookie.match(/session=([^;]+)/);
        if (!sessionMatch) throw new Error("Session tidak ditemukan");
        const sessionCookie = sessionMatch[1];
        
        const htmlText = homeRes.data;
        const bootstrapMatch = htmlText.match(/window\.__BOOTSTRAP__\s*=\s*(\{.*?\})/s);
        if (!bootstrapMatch) throw new Error("Bootstrap tidak ditemukan");
        const { nonce, powChallenge, powDifficulty, challengeType } = JSON.parse(bootstrapMatch[1]);

        const powSolution = this.generatePowSolution(powChallenge, nonce, powDifficulty, challengeType || 'classic');
        if (!powSolution) throw new Error("Gagal PoW");

        const authRes = await axios.post(`${this.baseUrl}/api/auth/issue`, '', {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': this.baseUrl,
                'Referer': `${this.baseUrl}/id`,
                'Cookie': `session=${sessionCookie}`,
                'x-page-nonce': nonce,
                'x-pow-solution': powSolution,
                'X-Forwarded-For': ip,
                'X-Real-IP': ip,
                'Client-IP': ip
            }
        });

        const authData = authRes.data;
        return { jwtToken: authData.accessToken, sessionCookie };
    }

    async download(targetUrl) {
        if (!targetUrl || typeof targetUrl !== 'string') {
            throw new Error("URL salah");
        }
        
        const ip = this.getRandomIp();
        const { jwtToken, sessionCookie } = await this.autoGetJwtAndSession(ip);

        const res = await axios.post(`${this.baseUrl}/api/autolink`, {
            data: {
                url: targetUrl,
                unlock: true
            }
        }, {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`,
                'Origin': this.baseUrl,
                'Referer': `${this.baseUrl}/id`,
                'Cookie': `session=${sessionCookie}`,
            }
        });

        return res.data;
    }
}

const getCreator = () => {
    return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
    
    // AIO Downloader endpoint
    app.get('/download/aio', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "url" diperlukan (URL video/media)'
            });
        }
        
        try {
            const downloader = new J2Downloader();
            const result = await downloader.download(url);
            
            res.json({
                status: true,
                creator: getCreator(),
                result: result
            });
            
        } catch (error) {
            console.error('[AIO Downloader Error]', error.message);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
