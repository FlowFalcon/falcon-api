const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://v1.animasu.work";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/anime/animasu/schedule', async (req, res) => {
    try {
      const { data } = await axios.get(`${BASE_URL}/jadwal/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Referer': BASE_URL,
          'Cookie': 'cf_clearance=1; _ga=1; _ym_uid=1; _ym_d=1; _ym_isad=1'
        },
        timeout: 30000
      });

      const $ = cheerio.load(data);
      
      // Ambil semua teks dari .postbody
      const rawText = $('.postbody').text();
      const lines = rawText.split('\n').map(s => s.trim()).filter(s => s.length > 0);

      // ─── URUTAN HARI ──────────────────────────────────────
      const daysInOrder = ['Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu'];
      const skipWords = ['Sudah Rilis!', '??', 'Jum\'at', 'Update Acak', '≡', '》', 'Download', 'Tipe', 'Ambisi', 'Anak-Anak', 'Anti-Sosial', 'Badass', 'Berbisnis', 'Berisik', 'Berjuang', 'Beruntung', 'Blakblakan', 'Bounty Hunter', 'Cerewet', 'Ceria', 'Ceroboh', 'Cewek', 'Couple', 'Cowok', 'Dewa', 'Dikagumi', 'Disepelekan', 'Ditakuti', 'Iblis', 'Jenius', 'Kejam', 'Legenda', 'Licik', 'Loli', 'Mencolok', 'Menyebalkan', 'Mesum', 'Monster', 'Narsis', 'Optimis', 'Overpower', 'Pemalas', 'Pemalu', 'Pemimpin', 'Penakut', 'Pendiam', 'Pesimis', 'Polos', 'Semangat', 'Setia', 'Slengekan', 'Sopan', 'Suram', 'Terkutuk', 'Totalitas', 'Tsundere', 'Vampir', 'Yandere', 'Zero To Hero'];
      
      const schedule = {
        Kamis: [],
        Jumat: [],
        Sabtu: [],
        Minggu: [],
        Senin: [],
        Selasa: [],
        Rabu: [],
        'Update Acak': []
      };

      let currentDay = null;
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // ─── Cek Hari ────────────────────────────────────────
        if (daysInOrder.includes(line)) {
          currentDay = line;
          i++;
          continue;
        }

        // ─── Cek "Update Acak" ──────────────────────────────
        if (line === 'Update Acak') {
          currentDay = 'Update Acak';
          i++;
          continue;
        }

        // ─── Skip waktu ──────────────────────────────────────
        if (line.match(/\d+h\s+\d+j\s+\d+m\s+lagi/)) {
          i++;
          continue;
        }

        // ─── Skip angka ──────────────────────────────────────
        if (line.match(/^\d+$/)) {
          i++;
          continue;
        }

        // ─── Skip kata-kata skip ────────────────────────────
        if (skipWords.includes(line)) {
          i++;
          continue;
        }

        // ─── AMBIL JUDUL! ────────────────────────────────────
        if (currentDay && line.length > 2) {
          schedule[currentDay].push(line);
          i++;
          continue;
        }

        i++;
      }

      // ─── Buat response dengan urutan yang benar ──────────
      const orderedSchedule = {};
      for (const day of daysInOrder) {
        orderedSchedule[day] = schedule[day] || [];
      }
      orderedSchedule['Update Acak'] = schedule['Update Acak'] || [];

      // ─── Response ──────────────────────────────────────────
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          source: BASE_URL,
          last_updated: new Date().toISOString(),
          schedule: orderedSchedule
        }
      });

    } catch (error) {
      console.error('[Animasu Schedule Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
