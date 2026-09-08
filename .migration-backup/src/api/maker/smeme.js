// smeme.js - Generate meme dengan teks atas/bawah (font Impact)
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { readFile, writeFile, mkdir, unlink } = require("fs/promises");
const { existsSync, createWriteStream, statSync } = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const multer = require("multer");

const FONT_IMPACT = {
  url: "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/impact.ttf",
  localPath: path.join(os.tmpdir(), "fonts", "impact.ttf"),
  family: "SmemeImpact",
};

const DEFAULT_CONFIG = {
  fontSize: 0,
  strokeWidth: 0,
  maxWidth: 1000,
  autoFontRatio: 0.16,
  autoFontHeightRatio: 0.13,
  minFontSize: 20,
  maxFontSize: 180,
  maxTextRatio: 0.92,
  autoStrokeRatio: 0.14,
  minStrokeWidth: 2,
  maxStrokeWidth: 28,
  safePadding: 2,
  sameFontSize: true,
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    let file = createWriteStream(dest);

    const get = (targetUrl) => {
      https.get(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },
      }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          file.close();
          file = createWriteStream(dest);
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`Gagal download font: HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", (err) => { file.close(); reject(err); });
      }).on("error", reject);
    };
    get(url);
  });
}

async function ensureImpactFont() {
  const fontDir = path.dirname(FONT_IMPACT.localPath);
  await mkdir(fontDir, { recursive: true });

  const exists = existsSync(FONT_IMPACT.localPath);
  const valid = exists && statSync(FONT_IMPACT.localPath).size >= 10000;

  if (!valid) {
    if (exists) await unlink(FONT_IMPACT.localPath).catch(() => {});
    await downloadFile(FONT_IMPACT.url, FONT_IMPACT.localPath);
  }

  const ok = GlobalFonts.registerFromPath(FONT_IMPACT.localPath, FONT_IMPACT.family);
  if (!ok) throw new Error(`Font Impact gagal diregister`);

  return true;
}

let fontRegistered = false;

async function loadFonts() {
  if (fontRegistered) return;
  await ensureImpactFont();
  fontRegistered = true;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fontCss(size) {
  return `${size}px "${FONT_IMPACT.family}"`;
}

function getAutoFontSize(canvasW, canvasH, config) {
  const byWidth = canvasW * config.autoFontRatio;
  const byHeight = canvasH * config.autoFontHeightRatio;
  return clamp(Math.min(byWidth, byHeight), config.minFontSize, config.maxFontSize);
}

function getStrokeWidthFromFont(fontSize, ratio, config) {
  if (config.strokeWidth > 0) {
    return Math.max(1, config.strokeWidth * ratio);
  }
  return clamp(fontSize * config.autoStrokeRatio, config.minStrokeWidth, config.maxStrokeWidth);
}

function getMaxTextWidth(canvasW, strokeWidth, config) {
  const safe = config.safePadding + strokeWidth / 2;
  const byRatio = canvasW * config.maxTextRatio;
  const bySafeZone = canvasW - safe * 2;
  return Math.max(1, Math.min(byRatio, bySafeZone));
}

function fitFontToSafeZone(ctx, text, startSize, ratio, canvasW, config) {
  if (!text) return startSize;
  let size = startSize;
  while (size > config.minFontSize) {
    const strokeWidth = getStrokeWidthFromFont(size, ratio, config);
    const maxTextWidth = getMaxTextWidth(canvasW, strokeWidth, config);
    ctx.font = fontCss(size);
    const textWidth = ctx.measureText(text).width + strokeWidth;
    if (textWidth <= maxTextWidth) break;
    size -= 2;
  }
  return Math.max(size, config.minFontSize);
}

function getFinalFontSize(ctx, text, ratio, canvasW, canvasH, config) {
  const startSize = config.fontSize > 0 ? config.fontSize * ratio : getAutoFontSize(canvasW, canvasH, config);
  return fitFontToSafeZone(ctx, text, startSize, ratio, canvasW, config);
}

function getTextPosition(type, canvasW, canvasH, strokeWidth, config) {
  const safe = config.safePadding + strokeWidth / 2;
  if (type === "top") {
    return { x: canvasW / 2, y: safe, baseline: "top" };
  }
  return { x: canvasW / 2, y: canvasH - safe, baseline: "bottom" };
}

async function generateMeme(imageBuffer, topText, bottomText, customConfig = {}) {
  await loadFonts();

  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const img = await loadImage(imageBuffer);

  const ratio = Math.min(config.maxWidth / img.width, 1);
  const canvasW = Math.round(img.width * ratio);
  const canvasH = Math.round(img.height * ratio);

  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0, canvasW, canvasH);

  let topFont = topText ? getFinalFontSize(ctx, topText, ratio, canvasW, canvasH, config) : config.minFontSize;
  let bottomFont = bottomText ? getFinalFontSize(ctx, bottomText, ratio, canvasW, canvasH, config) : config.minFontSize;

  if (config.sameFontSize && topText && bottomText) {
    const finalFont = Math.min(topFont, bottomFont);
    topFont = finalFont;
    bottomFont = finalFont;
  }

  const topStroke = getStrokeWidthFromFont(topFont, ratio, config);
  const bottomStroke = getStrokeWidthFromFont(bottomFont, ratio, config);

  const topPos = getTextPosition("top", canvasW, canvasH, topStroke, config);
  const bottomPos = getTextPosition("bottom", canvasW, canvasH, bottomStroke, config);

  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  if (topText) {
    ctx.font = fontCss(topFont);
    ctx.lineWidth = topStroke;
    ctx.textBaseline = topPos.baseline;
    ctx.strokeText(topText, topPos.x, topPos.y);
    ctx.fillText(topText, topPos.x, topPos.y);
  }

  if (bottomText) {
    ctx.font = fontCss(bottomFont);
    ctx.lineWidth = bottomStroke;
    ctx.textBaseline = bottomPos.baseline;
    ctx.strokeText(bottomText, bottomPos.x, bottomPos.y);
    ctx.fillText(bottomText, bottomPos.x, bottomPos.y);
  }

  return await canvas.encode("png");
}

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Format harus gambar'));
  }
});

// ========== EXPRESS ENDPOINT ==========
module.exports = (app) => {

  // POST /maker/smeme (upload file)
  app.post('/maker/smeme', upload.single('image'), async (req, res) => {
    try {
      const { top, bottom, fontSize, strokeWidth } = req.body;

      if (!req.file) {
        return res.status(400).json({ status: false, error: 'File gambar (image) wajib diupload' });
      }

      const config = {};
      if (fontSize && !isNaN(parseInt(fontSize))) config.fontSize = parseInt(fontSize);
      if (strokeWidth && !isNaN(parseInt(strokeWidth))) config.strokeWidth = parseInt(strokeWidth);

      const resultBuffer = await generateMeme(
        req.file.buffer,
        top || "",
        bottom || "",
        config
      );

      res.setHeader('Content-Type', 'image/png');
      res.send(resultBuffer);

    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });

  // GET /maker/smeme?top=Halo&bottom=Guyc&url=...
  app.get('/maker/smeme', async (req, res) => {
    try {
      const { top, bottom, url, fontSize, strokeWidth } = req.query;

      if (!url) {
        return res.status(400).json({ status: false, error: 'Parameter url (gambar) wajib diisi' });
      }

      // Download gambar dari URL
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) {
        throw new Error('Gagal download gambar dari URL');
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      const config = {};
      if (fontSize && !isNaN(parseInt(fontSize))) config.fontSize = parseInt(fontSize);
      if (strokeWidth && !isNaN(parseInt(strokeWidth))) config.strokeWidth = parseInt(strokeWidth);

      const resultBuffer = await generateMeme(
        imageBuffer,
        top || "",
        bottom || "",
        config
      );

      res.setHeader('Content-Type', 'image/png');
      res.send(resultBuffer);

    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });

};
