/**
 * Auto-installer untuk yt-dlp binary
 * Dijalankan otomatis saat server start
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, 'bin');
const YTDLP_PATH = path.join(BIN_DIR, 'yt-dlp');
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

function downloadFile(url, dest, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));

    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'User-Agent': 'yt-dlp-installer' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest, redirectCount + 1)
          .then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error('HTTP ' + res.statusCode));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => { file.close(); try { fs.unlinkSync(dest); } catch(_){} reject(err); });
  });
}

async function setupYtdlp() {
  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

  if (fs.existsSync(YTDLP_PATH)) {
    try {
      const ver = execSync(YTDLP_PATH + ' --version', { timeout: 5000 }).toString().trim();
      console.log('\x1b[32m[yt-dlp] Sudah terinstall — versi ' + ver + '\x1b[0m');
      return;
    } catch (_) {
      fs.unlinkSync(YTDLP_PATH);
    }
  }

  console.log('\x1b[33m[yt-dlp] Binary tidak ditemukan, mengunduh dari GitHub...\x1b[0m');
  await downloadFile(YTDLP_URL, YTDLP_PATH);
  fs.chmodSync(YTDLP_PATH, 0o755);

  const ver = execSync(YTDLP_PATH + ' --version', { timeout: 5000 }).toString().trim();
  console.log('\x1b[32m[yt-dlp] Berhasil diinstall — versi ' + ver + '\x1b[0m');
}

module.exports = setupYtdlp;
