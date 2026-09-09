// gemini.js - Google Gemini AI (gratis via notegpt.io) - VERSI SIMPEL
const axios = require("axios");
const crypto = require("crypto");

const BASE = "https://notegpt.io";
const ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

// Simpen history chat per session
const sessions = new Map();

function uuid() {
  return crypto.randomUUID();
}

function randomNumber(length = 10) {
  let result = "";
  for (let i = 0; i < length; i++) result += Math.floor(Math.random() * 10);
  return result;
}

function makeSboxGuid() {
  const now = Math.floor(Date.now() / 1000);
  const raw = `${now}|13|${randomNumber(9)}`;
  return Buffer.from(raw).toString("base64");
}

function makeCookieHeader() {
  const now = Math.floor(Date.now() / 1000);
  const anonymousUserId = uuid();

  return [
    `sbox-guid=${encodeURIComponent(makeSboxGuid())}`,
    `anonymous_user_id=${anonymousUserId}`,
    `_gid=GA1.2.${randomNumber(9)}.${now}`,
    `_ga=GA1.2.${randomNumber(9)}.${now}`,
    `_ga_PFX3BRW5RQ=GS2.1.s${now}$o1$g1$t${now}$j20$l0$h${randomNumber(10)}`,
  ].join("; ");
}

function toHistoryMessages(history) {
  if (!history || history.length === 0) return [];
  return history.slice(-5).flatMap((item) => [
    { role: "user", content: item.user },
    { role: "assistant", content: item.assistant },
  ]);
}

function parseSSE(rawBody) {
  let result = "";

  for (const line of rawBody.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean.startsWith("data:")) continue;

    const raw = clean.replace(/^data:\s*/, "").trim();
    if (!raw || raw === "[DONE]") continue;

    try {
      const json = JSON.parse(raw);
      if (json.text) result += json.text;
      if (json.done) break;
    } catch {}
  }

  return result;
}

async function geminiChat(prompt, history = []) {
  const conversationId = uuid();
  const cookieHeader = makeCookieHeader();

  const payload = {
    message: prompt,
    language: "auto",
    model: "gemini-3.1-flash-lite-preview",
    tone: "default",
    length: "moderate",
    conversation_id: conversationId,
    image_urls: [],
    history_messages: toHistoryMessages(history),
    chat_mode: "standard",
  };

  const res = await axios.post(`${BASE}/api/v2/chat/stream`, JSON.stringify(payload), {
    timeout: 60000,
    responseType: "stream",
    validateStatus: () => true,
    headers: {
      "sec-ch-ua-platform": `"Android"`,
      "User-Agent": ua,
      "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
      "Content-Type": "application/json",
      "sec-ch-ua-mobile": "?1",
      Accept: "*/*",
      Origin: BASE,
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      Referer: `${BASE}/ai-chat`,
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "id-ID,id;q=0.9",
      Cookie: cookieHeader,
      priority: "u=1, i",
    },
  });

  let rawBody = "";
  res.data.setEncoding("utf8");

  for await (const chunk of res.data) {
    rawBody += chunk;
  }

  const answer = parseSSE(rawBody);

  return {
    success: Boolean(answer),
    conversation_id: conversationId,
    answer: answer,
  };
}

// ========== EXPRESS ENDPOINT (SIMPEL) ==========
module.exports = (app) => {
  
  // GET /ai/gemini?text=hello
  app.get('/ai/gemini', async (req, res) => {
    try {
      const { text, session_id } = req.query;
      
      if (!text) {
        return res.status(400).json({ 
          status: false, 
          creator: 'AxlyDev',
          error: 'Parameter text (pertanyaan) wajib diisi' 
        });
      }
      
      // Ambil history dari session
      let history = [];
      if (session_id && sessions.has(session_id)) {
        history = sessions.get(session_id);
      }
      
      const result = await geminiChat(text, history);
      
      // Simpan history
      if (session_id && result.answer) {
        const newHistory = [...history, { user: text, assistant: result.answer }];
        sessions.set(session_id, newHistory.slice(-10));
      }
      
      res.json({
        status: result.success,
        creator: 'AxlyDev',
        data: {
          question: text,
          answer: result.answer
        }
      });
      
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        creator: 'AxlyDev',
        error: error.message 
      });
    }
  });
  
  // POST /ai/gemini
  app.post('/ai/gemini', async (req, res) => {
    try {
      const { text, session_id } = req.body;
      
      if (!text) {
        return res.status(400).json({ 
          status: false, 
          creator: 'AxlyDev',
          error: 'Parameter text (pertanyaan) wajib diisi' 
        });
      }
      
      let history = [];
      if (session_id && sessions.has(session_id)) {
        history = sessions.get(session_id);
      }
      
      const result = await geminiChat(text, history);
      
      if (session_id && result.answer) {
        const newHistory = [...history, { user: text, assistant: result.answer }];
        sessions.set(session_id, newHistory.slice(-10));
      }
      
      res.json({
        status: result.success,
        creator: 'AxlyDev',
        data: {
          question: text,
          answer: result.answer
        }
      });
      
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        creator: 'AxlyDev',
        error: error.message 
      });
    }
  });
  
};
