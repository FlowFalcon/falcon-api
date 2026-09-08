const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

module.exports = (app) => {
    // GET endpoint (pake URL)
    app.get('/maker/tofigure', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, error: 'Parameter "url" diperlukan' });
        
        try {
            const response = await axios.get(`https://www.neoapis.xyz/api/ai-image/tofigure?url=${encodeURIComponent(url)}`, {
                responseType: 'arraybuffer'
            });
            res.setHeader('Content-Type', 'image/png');
            res.send(response.data);
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });

    // POST endpoint (upload file)
    app.post('/maker/tofigure', upload.single('file'), async (req, res) => {
        if (!req.file) return res.status(400).json({ status: false, error: 'Tidak ada file' });
        
        try {
            const formData = new FormData();
            formData.append('file', req.file.buffer, { filename: req.file.originalname });
            
            const response = await axios.post('https://www.neoapis.xyz/api/ai-image/tofigure', formData, {
                headers: { ...formData.getHeaders() },
                responseType: 'arraybuffer'
            });
            res.setHeader('Content-Type', 'image/png');
            res.send(response.data);
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
