const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const multer = require('multer');

require("./function.js");

const setupYtdlp = require('./setup-ytdlp.js');

// ════════════════════════════════════════════════════
// AXLY API · Stats & Persistence
// ════════════════════════════════════════════════════
const STATS_FILE = path.join(__dirname, 'runtime-stats.json');
global.startTime = Date.now();
global.totalreq  = 0;
try {
  const _sv = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  global.totalreq = _sv.totalreq || 0;
} catch (_e) {}
function _saveStats() {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify({ totalreq: global.totalreq }), 'utf8'); }
  catch (_e) {}
}
setInterval(_saveStats, 5000);
process.on('exit',    _saveStats);
process.on('SIGTERM', () => { _saveStats(); process.exit(0); });
process.on('SIGINT',  () => { _saveStats(); process.exit(0); });
// ════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 8080;

const upload = multer({ storage: multer.memoryStorage() });
global.upload = upload;

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1396122030163628112/-vEj4HjREjbaOVXDu5932YjeHpTkjNSKyUKugBFF9yVCBeQSrdgK8qM3HNxVYTOD5BYP';

let logBuffer = [];
setInterval(() => {
    if (logBuffer.length === 0) return;
    const combinedLogs = logBuffer.join('\n');
    logBuffer = [];
    const payload = ` \`\`\`ansi\n${combinedLogs}\n\`\`\``;
    axios.post(WEBHOOK_URL, { content: payload }).catch(() => {});
}, 2000);

function queueLog({ method, status, url, duration, error = null }) {
    let colorCode;
    if (status >= 500) colorCode = '\u001b[2;31m';
    else if (status >= 400) colorCode = '\u001b[2;31m';
    else if (status === 304) colorCode = '\u001b[2;34m';
    else colorCode = '\u001b[2;32m';
    let line = `${colorCode}[${method}] ${status} ${url} - ${duration}ms\u001b[0m`;
    if (error) line += `\n\u001b[2;31m[ERROR] ${error.message || error}\u001b[0m`;
    logBuffer.push(line);
}

// Cooldown
let requestCount = 0;
let isCooldown = false;
setInterval(() => { requestCount = 0; }, 1000);

app.use((req, res, next) => {
    if (isCooldown) {
        queueLog({ method: req.method, status: 503, url: req.originalUrl, duration: 0, error: 'Cooldown' });
        return res.status(503).json({ error: 'Server is in cooldown, try again later.' });
    }
    requestCount++;
    if (requestCount > 30) {
        isCooldown = true;
        const cooldownTime = (Math.random() * (120000 - 60000) + 60000).toFixed(3);
        console.log(`⚠️ SPAM DETECT: Cooldown ${cooldownTime / 1000} detik`);
        axios.post(WEBHOOK_URL, { content: `⚠️ SPAM DETECT — cooldown ${cooldownTime / 1000}s` }).catch(() => {});
        setTimeout(() => {
            isCooldown = false;
            console.log('✅ Cooldown selesai');
        }, cooldownTime);
        return res.status(503).json({ error: 'Too many requests, server cooldown!' });
    }
    next();
});

app.enable("trust proxy");
app.set("json spaces", 2);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Load Settings
const settingsPath = path.join(__dirname, './assets/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
global.apikey = settings.apiSettings.apikey;

// Logging middleware
app.use((req, res, next) => {
    console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Request: ${req.path} `));
    const _skipCount = ['/', '/docs', '/home', '/stats', '/settings', '/notifications', '/favicon.svg', '/robots.txt', '/opengraph.jpg'];
    const _isStaticAsset = req.path.startsWith('/assets/');
    if (!_isStaticAsset && !_skipCount.includes(req.path)) global.totalreq += 1;
    const start = Date.now();
    const originalJson = res.json.bind(res);
    res.json = function (data) {
        if (data && typeof data === 'object') {
            return originalJson({ status: data.status, creator: settings.apiSettings.creator || "Axly API", ...data });
        }
        return originalJson(data);
    };
    res.on('finish', () => {
        queueLog({ method: req.method, status: res.statusCode, url: req.originalUrl, duration: Date.now() - start });
    });
    next();
});

// ════════════════════════════════════════════════════
// STATIC — Serve /assets folder (banner.jpg, icon.png, etc.)
// ════════════════════════════════════════════════════
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// Also serve compiled frontend assets from public/assets
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
// Serve other public static files (favicon, opengraph, etc.)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ════════════════════════════════════════════════════
// BLOCK direct access to source code
// ════════════════════════════════════════════════════
app.use('/src', (req, res) => {
    res.status(403).json({ error: 'Forbidden access' });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  res.json({
    status: true,
    totalRequests: global.totalreq,
    startTime: global.startTime,
    runtime: Date.now() - global.startTime,
    uptime: process.uptime()
  });
});

// Settings endpoint
app.get('/settings', (req, res) => {
  res.json(settings);
});

// Notifications endpoint
app.get('/notifications', (req, res) => {
  try {
    const notifs = JSON.parse(fs.readFileSync(path.join(__dirname, 'api-page', 'notifications.json'), 'utf-8'));
    res.json(notifs);
  } catch (_e) {
    res.json([]);
  }
});

// ════════════════════════════════════════════════════
// DYNAMIC API ROUTES
// ════════════════════════════════════════════════════
let totalRoutes = 0;
const apiFolder = path.join(__dirname, './src/api');
fs.readdirSync(apiFolder).forEach((subfolder) => {
    const subfolderPath = path.join(apiFolder, subfolder);
    if (fs.statSync(subfolderPath).isDirectory()) {
        fs.readdirSync(subfolderPath).forEach((file) => {
            const filePath = path.join(subfolderPath, file);
            if (path.extname(file) === '.js') {
                try {
                    require(filePath)(app);
                    totalRoutes++;
                    console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Loaded: ${path.basename(file)} `));
                } catch (e) {
                    console.log(chalk.bgRed.white(` Skip (error): ${path.basename(file)} — ${e.message} `));
                }
            }
        });
    }
});

console.log(chalk.bgHex('#90EE90').hex('#333').bold(' Load Complete! ✓ '));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Total Routes: ${totalRoutes} `));

// ════════════════════════════════════════════════════
// LANDING PAGE at / (root)
// ════════════════════════════════════════════════════
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// /home → redirect to landing page
app.get('/home', (req, res) => {
    res.redirect('/');
});

// ════════════════════════════════════════════════════
// API DOCS at /docs
// ════════════════════════════════════════════════════
app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-page', 'index.html'));
});

// ════════════════════════════════════════════════════
// 404 fallback
// ════════════════════════════════════════════════════
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'api-page', '404.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    queueLog({ method: req.method, status: 500, url: req.originalUrl, duration: 0, error: err });
    res.status(500).sendFile(path.join(__dirname, 'api-page', '500.html'));
});

setupYtdlp()
  .catch(e => console.error('\x1b[31m[yt-dlp] Gagal install:', e.message, '\x1b[0m'))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(chalk.bgHex('#90EE90').hex('#333').bold(` ✅ Axly API running at http://localhost:${PORT} `));
    });
  });

module.exports = app;
