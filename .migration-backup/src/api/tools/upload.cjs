const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const CATBOX_URL = 'https://catbox.moe/user/api.php';

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

async function uploadToCatbox(fileBuffer, filename) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('userhash', '');
  form.append('fileToUpload', fileBuffer, { filename });

  const res = await axios.post(CATBOX_URL, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60000
  });

  const url = (res.data || '').toString().trim();
  if (!url.startsWith('http')) throw new Error('Upload gagal: ' + url);
  return url;
}

module.exports = (app) => {

  app.post('/tools/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Tidak ada file. Kirim file dengan key "file"'
      });
    }

    try {
      const url = await uploadToCatbox(req.file.buffer, req.file.originalname);
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          url,
          original_name: req.file.originalname,
          size: req.file.size
        }
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
