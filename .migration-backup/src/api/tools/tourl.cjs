const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function uploadToLitter(fileBuffer, filename) {
    const form = new FormData();
    form.append('file', fileBuffer, { filename });
    form.append('expireAfter', '99999999999999');
    form.append('burn', 'false');

    const token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

    const response = await axios.post('https://litter.lusia.moe/post/upload', form, {
        params: { token },
        headers: {
            ...form.getHeaders(),
            'origin': 'https://litter.lusia.moe',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10) Chrome/132.0.0.0'
        }
    });

    return `https://litter.lusia.moe/${response.data.path}`;
}

module.exports = (app) => {
    // Endpoint yang bisa menerima file (WA) atau parameter url (web)
    app.post('/tools/upload', upload.single('file'), async (req, res) => {
        try {
            let fileBuffer, originalName;

            if (req.file) {
                // Case 1: upload file langsung (bot WA)
                fileBuffer = req.file.buffer;
                originalName = req.file.originalname;
            } 
            else if (req.query.url || req.body.url) {
                // Case 2: upload dari URL (testing di web)
                const imageUrl = req.query.url || req.body.url;
                const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                fileBuffer = Buffer.from(imageRes.data);
                const contentType = imageRes.headers['content-type'];
                let ext = 'jpg';
                if (contentType.includes('png')) ext = 'png';
                else if (contentType.includes('gif')) ext = 'gif';
                else if (contentType.includes('webp')) ext = 'webp';
                else if (contentType.includes('video')) ext = 'mp4';
                originalName = `from_url_${Date.now()}.${ext}`;
            } 
            else {
                return res.status(400).json({ status: false, error: 'Kirim file (multipart) atau parameter "url"' });
            }

            const uploadedUrl = await uploadToLitter(fileBuffer, originalName);
            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    url: uploadedUrl,
                    originalName: originalName,
                    size: fileBuffer.length
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message });
        }
    });

    // Halaman HTML untuk test di browser (optional)
    app.get('/tools/tourl', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Upload ke Litter</title></head>
            <body style="font-family:sans-serif;max-width:600px;margin:50px auto">
                <h2>Upload File atau URL</h2>
                <form id="fileForm" enctype="multipart/form-data">
                    <input type="file" name="file" accept="image/*,video/*" required>
                    <button type="submit">Upload File</button>
                </form>
                <hr>
                <form id="urlForm">
                    <input type="text" name="url" placeholder="https://example.com/gambar.jpg" style="width:100%" required>
                    <button type="submit">Upload dari URL</button>
                </form>
                <div id="result" style="margin-top:20px;background:#eee;padding:10px"></div>
                <script>
                    const fileForm = document.getElementById('fileForm');
                    const urlForm = document.getElementById('urlForm');
                    const resultDiv = document.getElementById('result');
                    fileForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const formData = new FormData(fileForm);
                        const res = await fetch('/tools/upload', { method:'POST', body:formData });
                        const json = await res.json();
                        resultDiv.innerHTML = json.status ? '<a href="'+json.result.url+'" target="_blank">'+json.result.url+'</a>' : 'Error: '+json.error;
                    };
                    urlForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const url = new URLSearchParams(new FormData(urlForm)).get('url');
                        const res = await fetch('/tools/upload?url='+encodeURIComponent(url), { method:'POST' });
                        const json = await res.json();
                        resultDiv.innerHTML = json.status ? '<a href="'+json.result.url+'" target="_blank">'+json.result.url+'</a>' : 'Error: '+json.error;
                    };
                </script>
            </body>
            </html>
        `);
    });
};
