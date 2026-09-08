const axios = require('axios');

class ChatMusicAPI {
    constructor() {
        this.baseUrl = 'https://api.chatmusicpro.com';
        this.identityId = this.generateUUID();
        this.token = null;
        this.headers = {
            'User-Agent': 'android',
            'Accept-Encoding': 'gzip',
            'Content-Type': 'application/x-www-form-urlencoded',
            'region-code': 'ID',
            'user-type': 'android',
            'version': '1.0.3',
            'app-type': '1',
            'language': 'EN',
            'identity-id': this.identityId,
            'app-market': 'google_play'
        };
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16).toUpperCase();
        });
    }

    async request(endpoint, data = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const body = new URLSearchParams(data).toString();
        const headers = { ...this.headers };

        if (this.token) headers['token'] = this.token;

        const response = await axios.post(url, body, { headers, timeout: 30000 });
        return response.data;
    }

    async login() {
        const result = await this.request('/v1/user/device_login', {
            source_site: 'google_play',
            identity_id: this.identityId
        });

        if (result.code === 200) {
            this.token = result.data.token;
            return result.data;
        }
        throw new Error(`Login failed: ${result.message}`);
    }

    async generateMusic(params) {
        const payload = {
            music_model_id: params.modelId || 6,
            title: params.title || 'My Song',
            prompt: params.prompt || '',
            lyrics: params.lyrics || '',
            is_instrumental: params.isInstrumental || 0,
            music_style: params.musicStyle || '',
            music_style_code: params.musicStyleCode || '',
            gender_type: params.genderType || 0
        };

        const result = await this.request('/music/create-music', payload);
        if (result.code === 200) return result.data.create_id;
        throw new Error(`Creation failed: ${result.message}`);
    }

    async getProgress(id) {
        const result = await this.request('/music/get-music-progress', { id });
        if (result.code === 200) return result.data;
        throw new Error(`Progress check failed: ${result.message}`);
    }

    async waitTasks(ids) {
        const completed = new Set();
        const results = [];

        while (completed.size < ids.length) {
            for (const id of ids) {
                if (completed.has(id)) continue;
                try {
                    const status = await this.getProgress(id);
                    if (status.music_file) {
                        completed.add(id);
                        results.push(status);
                    }
                } catch (e) {}
            }
            if (completed.size < ids.length) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        return results;
    }

    async generate(payload) {
        await this.login();
        const taskIds = await this.generateMusic(payload);
        return await this.waitTasks([taskIds]);
    }
}

module.exports = (app) => {
    app.get('/ai/music', async (req, res) => {
        const { prompt, title, modelId, instrumental, style } = req.query;

        if (!prompt) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "prompt" diperlukan (deskripsi musik)'
            });
        }

        try {
            const api = new ChatMusicAPI();
            const results = await api.generate({
                prompt: prompt,
                title: title || 'My Song',
                modelId: parseInt(modelId) || 6,
                isInstrumental: instrumental === 'true' ? 1 : 0,
                musicStyle: style || ''
            });

            const music = results[0];
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    title: music.title || title,
                    music_url: music.music_file,
                    duration: music.duration || null,
                    lyrics: music.lyrics || null
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal generate musik'
            });
        }
    });
};
