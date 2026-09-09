const axios = require("axios");
const FormData = require("form-data");

module.exports = function (app) {
  app.get("/tools/nsfw-check", async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' gambar wajib diisi."
      });
    }

    try {
      const imageRes = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(imageRes.data);

      const form = new FormData();
      form.append("image", buffer, {
        filename: "image.jpg",
        contentType: imageRes.headers["content-type"] || "image/jpeg"
      });

      const { data } = await axios.post("https://nsfw-categorize.it/api/upload", form, {
        headers: {
          ...form.getHeaders(),
          accept: "application/json",
          "x-requested-with": "XMLHttpRequest",
          // Reset sesi
          "cookie": "",
          "user-agent": `Mozilla/5.0 (Linux; Android 10; ID/${Math.random().toString(36).slice(2, 10)})`
        }
      });

      // Hapus quota dari hasil akhir
      if (data?.quota) delete data.quota;

      res.json({
        status: true,
        creator: "FlowFalcon",
        result: data
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Gagal proses NSFW",
        error: err.response?.data || err.message
      });
    }
  });
};
