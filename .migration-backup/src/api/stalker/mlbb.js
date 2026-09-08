const axios = require('axios');
const qs = require('qs');

async function checkML(user_id, zone_id) {
    try {
        const response = await axios.post(
            'https://pizzoshop.com/mlchecker/check',
            qs.stringify({ user_id, zone_id }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36',
                    'X-Requested-With': 'com.xbrowser.play'
                },
                timeout: 15000
            }
        );

        const html = response.data;

        const extract = (label) => {
            const regex = new RegExp(
                `<th[^>]*>${label}[\\s\\S]*?<\\/th>[\\s\\S]*?<td[^>]*>(.*?)<\\/td>`,
                'i'
            );
            const match = html.match(regex);
            return match ? match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null;
        };

        const nickname = extract('Nickname');
        const region = extract('Region ID');
        const lastLogin = extract('Last Login from');
        const created = extract('Created data date') || extract('Created date');
        const level = extract('Level');

        return {
            status: true,
            user_id: user_id,
            zone_id: zone_id,
            nickname: nickname || 'Tidak ditemukan',
            region: region || '-',
            level: level || '-',
            last_login_country: lastLogin || '-',
            created_date: created || '-',
            found: html.includes('Account found')
        };

    } catch (error) {
        return {
            status: false,
            error: error.message
        };
    }
}

module.exports = (app) => {
    app.get('/stalker/mlbb', async (req, res) => {
        const { id, zone } = req.query;

        if (!id) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "id" diperlukan (user_id)'
            });
        }

        if (!zone) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "zone" diperlukan (zone_id)'
            });
        }

        try {
            const result = await checkML(id, zone);
            
            if (!result.status) {
                throw new Error(result.error);
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    user_id: result.user_id,
                    zone_id: result.zone_id,
                    nickname: result.nickname,
                    region: result.region,
                    level: result.level,
                    last_login_country: result.last_login_country,
                    created_date: result.created_date,
                    found: result.found
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil data MLBB'
            });
        }
    });
};
