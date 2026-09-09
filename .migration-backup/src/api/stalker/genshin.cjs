const axios = require('axios');

module.exports = (app) => {
    app.get('/stalker/genshin', async (req, res) => {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "id" diperlukan (UID Genshin Impact)'
            });
        }

        // Validasi UID (harus angka 9 digit)
        if (!/^\d{9}$/.test(id)) {
            return res.status(400).json({
                status: false,
                error: 'UID harus 9 digit angka'
            });
        }

        try {
            const response = await axios.get(`https://dak.gg/genshin/profile/${id}?hl=en`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            // Ambil JSON dari <script id="__NEXT_DATA__">
            const match = response.data.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
            if (!match) throw new Error('Tidak dapat menemukan data profile');

            const json = JSON.parse(match[1]);
            const player = json.props?.pageProps?.account?.player;
            
            if (!player) throw new Error('Data user tidak ditemukan');

            // Format response
            const result = {
                uid: player.uid,
                nickname: player.nickname,
                level: player.level,
                world_level: player.worldLevel,
                achievements: player.detail?.achievements || 0,
                active_days: player.detail?.activeDays || 0,
                characters: player.detail?.characters || 0,
                spiral_abyss: player.detail?.spiralAbyss?.maxFloor || '-',
                avatar: player.iconUrl || null,
                server: player.server || '-'
            };

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil data Genshin Impact'
            });
        }
    });
};
