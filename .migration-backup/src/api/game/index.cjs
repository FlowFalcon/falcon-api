const scraperGames = require('@bochilteam/scraper-games');

const gamesList = [
    'tebakgambar', 'caklontong', 'family100', 'asahotak',
    'tebakkata', 'tekateki', 'tebakkimia',
    'siapakahaku', 'susunkata', 'tebakbendera', 'tebaklirik', 'tebaktebakan'
];

const activeGames = new Map();
const TIMEOUT = 120000;
const POIN = 500;

// Mapping lengkap flag code ke emoji
const flagEmojiMap = {
    // A
    'af': '🇦🇫', 'ax': '🇦🇽', 'al': '🇦🇱', 'dz': '🇩🇿', 'as': '🇦🇸',
    'ad': '🇦🇩', 'ao': '🇦🇴', 'ai': '🇦🇮', 'aq': '🇦🇶', 'ag': '🇦🇬',
    'ar': '🇦🇷', 'am': '🇦🇲', 'aw': '🇦🇼', 'au': '🇦🇺', 'at': '🇦🇹',
    'az': '🇦🇿',
    // B
    'bs': '🇧🇸', 'bh': '🇧🇭', 'bd': '🇧🇩', 'bb': '🇧🇧', 'by': '🇧🇾',
    'be': '🇧🇪', 'bz': '🇧🇿', 'bj': '🇧🇯', 'bm': '🇧🇲', 'bt': '🇧🇹',
    'bo': '🇧🇴', 'ba': '🇧🇦', 'bw': '🇧🇼', 'bv': '🇧🇻', 'br': '🇧🇷',
    'io': '🇮🇴', 'bn': '🇧🇳', 'bg': '🇧🇬', 'bf': '🇧🇫', 'bi': '🇧🇮',
    // C
    'kh': '🇰🇭', 'cm': '🇨🇲', 'ca': '🇨🇦', 'cv': '🇨🇻', 'ky': '🇰🇾',
    'cf': '🇨🇫', 'td': '🇹🇩', 'cl': '🇨🇱', 'cn': '🇨🇳', 'cx': '🇨🇽',
    'cc': '🇨🇨', 'co': '🇨🇴', 'km': '🇰🇲', 'cg': '🇨🇬', 'cd': '🇨🇩',
    'ck': '🇨🇰', 'cr': '🇨🇷', 'ci': '🇨🇮', 'hr': '🇭🇷', 'cu': '🇨🇺',
    'cy': '🇨🇾', 'cz': '🇨🇿',
    // D
    'dk': '🇩🇰', 'dj': '🇩🇯', 'dm': '🇩🇲', 'do': '🇩🇴',
    // E
    'ec': '🇪🇨', 'eg': '🇪🇬', 'sv': '🇸🇻', 'gq': '🇬🇶', 'er': '🇪🇷',
    'ee': '🇪🇪', 'et': '🇪🇹',
    // F
    'fk': '🇫🇰', 'fo': '🇫🇴', 'fj': '🇫🇯', 'fi': '🇫🇮', 'fr': '🇫🇷',
    'gf': '🇬🇫', 'pf': '🇵🇫', 'tf': '🇹🇫',
    // G
    'ga': '🇬🇦', 'gm': '🇬🇲', 'ge': '🇬🇪', 'de': '🇩🇪', 'gh': '🇬🇭',
    'gi': '🇬🇮', 'gr': '🇬🇷', 'gl': '🇬🇱', 'gd': '🇬🇩', 'gp': '🇬🇵',
    'gu': '🇬🇺', 'gt': '🇬🇹', 'gg': '🇬🇬', 'gn': '🇬🇳', 'gw': '🇬🇼',
    'gy': '🇬🇾',
    // H
    'ht': '🇭🇹', 'hm': '🇭🇲', 'va': '🇻🇦', 'hn': '🇭🇳', 'hk': '🇭🇰',
    'hu': '🇭🇺',
    // I
    'is': '🇮🇸', 'in': '🇮🇳', 'id': '🇮🇩', 'ir': '🇮🇷', 'iq': '🇮🇶',
    'ie': '🇮🇪', 'im': '🇮🇲', 'il': '🇮🇱', 'it': '🇮🇹',
    // J
    'jm': '🇯🇲', 'jp': '🇯🇵', 'je': '🇯🇪', 'jo': '🇯🇴',
    // K
    'kz': '🇰🇿', 'ke': '🇰🇪', 'ki': '🇰🇮', 'kp': '🇰🇵', 'kr': '🇰🇷',
    'kw': '🇰🇼', 'kg': '🇰🇬', 'la': '🇱🇦',
    // L
    'lv': '🇱🇻', 'lb': '🇱🇧', 'ls': '🇱🇸', 'lr': '🇱🇷', 'ly': '🇱🇾',
    'li': '🇱🇮', 'lt': '🇱🇹', 'lu': '🇱🇺',
    // M
    'mo': '🇲🇴', 'mk': '🇲🇰', 'mg': '🇲🇬', 'mw': '🇲🇼', 'my': '🇲🇾',
    'mv': '🇲🇻', 'ml': '🇲🇱', 'mt': '🇲🇹', 'mh': '🇲🇭', 'mq': '🇲🇶',
    'mr': '🇲🇷', 'mu': '🇲🇺', 'yt': '🇾🇹', 'mx': '🇲🇽', 'fm': '🇫🇲',
    'md': '🇲🇩', 'mc': '🇲🇨', 'mn': '🇲🇳', 'me': '🇲🇪', 'ms': '🇲🇸',
    'ma': '🇲🇦', 'mz': '🇲🇿', 'mm': '🇲🇲',
    // N
    'na': '🇳🇦', 'nr': '🇳🇷', 'np': '🇳🇵', 'nl': '🇳🇱', 'nc': '🇳🇨',
    'nz': '🇳🇿', 'ni': '🇳🇮', 'ne': '🇳🇪', 'ng': '🇳🇬', 'nu': '🇳🇺',
    'nf': '🇳🇫', 'mp': '🇲🇵', 'no': '🇳🇴',
    // O
    'om': '🇴🇲',
    // P
    'pk': '🇵🇰', 'pw': '🇵🇼', 'ps': '🇵🇸', 'pa': '🇵🇦', 'pg': '🇵🇬',
    'py': '🇵🇾', 'pe': '🇵🇪', 'ph': '🇵🇭', 'pn': '🇵🇳', 'pl': '🇵🇱',
    'pt': '🇵🇹', 'pr': '🇵🇷',
    // Q
    'qa': '🇶🇦',
    // R
    're': '🇷🇪', 'ro': '🇷🇴', 'ru': '🇷🇺', 'rw': '🇷🇼',
    // S
    'bl': '🇧🇱', 'sh': '🇸🇭', 'kn': '🇰🇳', 'lc': '🇱🇨', 'mf': '🇲🇫',
    'pm': '🇵🇲', 'vc': '🇻🇨', 'ws': '🇼🇸', 'sm': '🇸🇲', 'st': '🇸🇹',
    'sa': '🇸🇦', 'sn': '🇸🇳', 'rs': '🇷🇸', 'sc': '🇸🇨', 'sl': '🇸🇱',
    'sg': '🇸🇬', 'sx': '🇸🇽', 'sk': '🇸🇰', 'si': '🇸🇮', 'sb': '🇸🇧',
    'so': '🇸🇴', 'za': '🇿🇦', 'gs': '🇬🇸', 'ss': '🇸🇸', 'es': '🇪🇸',
    'lk': '🇱🇰', 'sd': '🇸🇩', 'sr': '🇸🇷', 'sj': '🇸🇯', 'sz': '🇸🇿',
    'se': '🇸🇪', 'ch': '🇨🇭', 'sy': '🇸🇾',
    // T
    'tw': '🇹🇼', 'tj': '🇹🇯', 'tz': '🇹🇿', 'th': '🇹🇭', 'tl': '🇹🇱',
    'tg': '🇹🇬', 'tk': '🇹🇰', 'to': '🇹🇴', 'tt': '🇹🇹', 'tn': '🇹🇳',
    'tr': '🇹🇷', 'tm': '🇹🇲', 'tc': '🇹🇨', 'tv': '🇹🇻',
    // U
    'ug': '🇺🇬', 'ua': '🇺🇦', 'ae': '🇦🇪', 'gb': '🇬🇧', 'us': '🇺🇸',
    'um': '🇺🇲', 'uy': '🇺🇾', 'uz': '🇺🇿',
    // V
    'vu': '🇻🇺', 've': '🇻🇪', 'vn': '🇻🇳', 'vg': '🇻🇬', 'vi': '🇻🇮',
    // W
    'wf': '🇼🇫', 'eh': '🇪🇭',
    // Y
    'ye': '🇾🇪',
    // Z
    'zm': '🇿🇲', 'zw': '🇿🇼'
};

function generateHint(jawaban) {
    if (!jawaban) return '???';
    const panjang = jawaban.length;
    const revealCount = Math.min(3, Math.floor(panjang / 3));
    return jawaban.slice(0, revealCount) + '×'.repeat(panjang - revealCount);
}

async function getGameData(gameType) {
    const gameFunc = scraperGames[gameType];
    const result = await gameFunc();
    
    let soal, jawaban, gambar = null, deskripsi = null;
    
    switch(gameType) {
        case 'tebakgambar':
            if (!result.jawaban || !result.img) {
                throw new Error('Data tebakgambar tidak lengkap');
            }
            soal = 'Tebak gambar ini!';
            jawaban = result.jawaban;
            gambar = result.img;
            deskripsi = result.deskripsi || null;
            break;
        case 'tebakbendera':
            const flagCode = result.flag?.toLowerCase();
            const emoji = flagEmojiMap[flagCode] || '🏁';
            soal = emoji;
            jawaban = result.name;
            break;
        case 'tebakkimia':
            soal = `Unsur kimia: ${result.unsur}`;
            jawaban = result.lambang;
            break;
        default:
            soal = result.soal;
            jawaban = result.jawaban;
    }
    
    if (!soal || !jawaban) {
        throw new Error(`Response game ${gameType} tidak valid`);
    }
    
    return { soal, jawaban, gambar, deskripsi };
}

async function startGame(gameType, userId) {
    const { soal, jawaban, gambar, deskripsi } = await getGameData(gameType);
    const hint = generateHint(jawaban);
    
    activeGames.set(userId, {
        type: gameType,
        soal: soal,
        jawaban: jawaban,
        gambar: gambar,
        deskripsi: deskripsi,
        startTime: Date.now(),
        timeout: setTimeout(() => activeGames.delete(userId), TIMEOUT)
    });
    
    return { soal, jawaban, hint, gambar, deskripsi };
}

module.exports = (app) => {
    gamesList.forEach(game => {
        app.get(`/game/${game}/start`, async (req, res) => {
            const { user_id = 'default' } = req.query;
            
            if (activeGames.has(user_id) && user_id !== 'default') {
                const remaining = Math.ceil((TIMEOUT - (Date.now() - activeGames.get(user_id).startTime)) / 1000);
                return res.status(400).json({ 
                    status: false, 
                    error: `Masih ada game aktif. Selesaikan dulu atau tunggu ${remaining} detik lagi.`,
                    remaining_seconds: remaining
                });
            }
            
            if (user_id === 'default' && activeGames.has('default')) {
                clearTimeout(activeGames.get('default').timeout);
                activeGames.delete('default');
            }
            
            try {
                const { soal, jawaban, hint, gambar, deskripsi } = await startGame(game, user_id);
                
                if (user_id === 'default') {
                    const gameData = activeGames.get('default');
                    if (gameData) {
                        clearTimeout(gameData.timeout);
                        activeGames.delete('default');
                    }
                }
                
                const response = { 
                    status: true, 
                    creator: 'AxlyChann', 
                    result: { soal, jawaban, hint } 
                };
                
                if (gambar) response.result.image_url = gambar;
                if (deskripsi) response.result.deskripsi = deskripsi;
                
                res.json(response);
            } catch (error) {
                console.error(error);
                res.status(500).json({ status: false, error: error.message });
            }
        });
    });
    
    app.get('/game/answer', async (req, res) => {
        const { user_id = 'default', answer } = req.query;
        
        if (!answer) {
            return res.status(400).json({ status: false, error: 'Parameter "answer" diperlukan' });
        }
        
        if (user_id === 'default') {
            return res.status(400).json({ status: false, error: 'Endpoint ini khusus untuk bot. Untuk testing langsung lihat response start.' });
        }
        
        const game = activeGames.get(user_id);
        if (!game) {
            return res.status(400).json({ status: false, error: 'Tidak ada game aktif. Mulai game baru dulu.' });
        }
        
        const isCorrect = answer.toLowerCase().trim() === game.jawaban.toLowerCase();
        const timeTaken = (Date.now() - game.startTime) / 1000;
        
        clearTimeout(game.timeout);
        activeGames.delete(user_id);
        
        if (isCorrect) {
            res.json({ 
                status: true, 
                creator: 'AxlyChann', 
                result: { 
                    correct: true, 
                    message: `✅ Jawaban benar! 🎉\nWaktu: ${timeTaken.toFixed(1)} detik\nBonus: +${POIN} XP`,
                    jawaban: game.jawaban, 
                    waktu: timeTaken, 
                    bonus: POIN, 
                    game_type: game.type 
                } 
            });
        } else {
            res.json({ 
                status: false, 
                error: `❌ Jawaban salah!`, 
                jawaban_benar: game.jawaban, 
                game_type: game.type 
            });
        }
    });
    
    app.get('/game/reset', async (req, res) => {
        const { user_id = 'default' } = req.query;
        if (activeGames.has(user_id)) {
            clearTimeout(activeGames.get(user_id).timeout);
            activeGames.delete(user_id);
        }
        res.json({ status: true, message: 'Game direset' });
    });
};
