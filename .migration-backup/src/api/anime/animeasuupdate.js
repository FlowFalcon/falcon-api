const axios = require('axios');
const cheerio = require('cheerio');

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/anime/animasu/updates', async (req, res) => {
    try {
      // Ambil dari Cbox
      const { data } = await axios.get('https://www5.cbox.ws/box/?boxid=946129&boxtag=dHK21Z', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Referer': 'https://v1.animasu.work/'
        },
        timeout: 30000
      });

      const $ = cheerio.load(data);
      const updates = [];

      // Ambil semua pesan dari div#messages
      $('#messages .msg').each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        
        if (!text) return;

        // Parse waktu
        const timeMatch = text.match(/^(\d+\s+(?:days?|hours?|minutes?|seconds?|ago|hour|day|min|sec))\s+/i);
        let time = null;
        let content = text;

        if (timeMatch) {
          time = timeMatch[1].trim();
          content = text.replace(timeMatch[0], '').trim();
        }

        // Cek apakah ini dari Bot Animasu
        const isBot = content.startsWith('Bot Animasu') || content.includes('Bot Animasu');
        if (isBot) {
          content = content.replace(/Bot Animasu\s*/, '').trim();
        }

        // Tentukan tipe: Anime baru atau Update episode
        let type = 'update';
        let title = content;
        let episode = null;

        if (content.startsWith('Anime:')) {
          type = 'anime_baru';
          title = content.replace('Anime:', '').trim();
        } else if (content.startsWith('Update:')) {
          type = 'update_episode';
          const updateText = content.replace('Update:', '').trim();
          
          // Cek apakah ada episode number
          const episodeMatch = updateText.match(/^(.*?)\s+(?:Episode|Ep)\s*([\d]+)/i);
          if (episodeMatch) {
            title = episodeMatch[1].trim();
            episode = parseInt(episodeMatch[2]);
          } else {
            title = updateText;
          }
        }

        if (title) {
          updates.push({
            time: time,
            type: type,
            title: title,
            episode: episode,
            raw: text
          });
        }
      });

      // ─── Response (SEMUA, tanpa batas) ─────────────────────
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          source: 'Animasu Cbox',
          total: updates.length,
          updates: updates
        }
      });

    } catch (error) {
      console.error('[Animasu Updates Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
