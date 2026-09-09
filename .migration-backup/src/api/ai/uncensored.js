// uncensored.js - AI Uncensored Chat (tanpa API key, gratis)
const { randomUUID } = require('crypto');

const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

async function askUncensored(question) {
  try {
    // 1. Ambil halaman utama buat dapetin CSRF token & cookie
    const initRes = await fetch('https://uncensored.chat/', {
      headers: { 'User-Agent': USER_AGENT }
    });
    const html = await initRes.text();
    
    const csrfMatch = html.match(/<meta name="csrf-token" content="([^"]+)">/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    let cookies = '';
    if (typeof initRes.headers.getSetCookie === 'function') {
      cookies = initRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    } else {
      const setCookie = initRes.headers.get('set-cookie');
      if (setCookie) cookies = setCookie.split(',').map(c => c.split(';')[0]).join('; ');
    }

    // 2. Buat room chat baru
    const startRes = await fetch('https://uncensored.chat/chats/start', {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookies
      },
      body: JSON.stringify({
        character_id: 87,
        message: question,
        think_mode: false,
        api_version: "v1"
      })
    });

    const location = startRes.headers.get('location');
    if (!location) return "Error: Gagal membuat room chat baru.";
    const chatId = location.split('/').pop();

    // 3. Kirim pesan dan ambil stream response
    const streamId = randomUUID().replace(/-/g, '').substring(0, 21);
    
    const streamRes = await fetch(`https://uncensored.chat/chats/${chatId}/stream`, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
        'X-Stream-ID': streamId,
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://uncensored.chat',
        'Referer': location,
        'Cookie': cookies
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: question, type: "text" }],
        api_version: "v1"
      })
    });

    const rawStream = await streamRes.text();

    // 4. Parse stream response
    let cleanText = '';
    const lines = rawStream.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: {"content":')) {
        try {
          const json = JSON.parse(line.substring(6));
          if (json.content) cleanText += json.content;
        } catch (e) {}
      }
    }

    return cleanText.trim() || "Maaf, AI tidak memberikan balasan.";

  } catch (error) {
    return "Error System: " + error.message;
  }
}

// ========== EXPRESS ENDPOINT ==========
module.exports = (app) => {
  
  // GET /ai/uncensored?text=hello
  app.get('/ai/uncensored', async (req, res) => {
    try {
      const { text } = req.query;
      if (!text) {
        return res.status(400).json({ 
          status: false, 
          error: 'Parameter text (pertanyaan) wajib diisi' 
        });
      }
      
      const answer = await askUncensored(text);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        data: {
          question: text,
          answer: answer
        }
      });
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        error: error.message 
      });
    }
  });
  
  // POST /ai/uncensored (support JSON body)
  app.post('/ai/uncensored', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ 
          status: false, 
          error: 'Parameter text (pertanyaan) wajib diisi' 
        });
      }
      
      const answer = await askUncensored(text);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        data: {
          question: text,
          answer: answer
        }
      });
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        error: error.message 
      });
    }
  });
  
};
