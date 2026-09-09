// brat.js - Brat image generator dengan emoji support
// GET /tools/brat?text=hello+world+🌅

module.exports = (app) => {

  app.get("/maker/brat", async (req, res) => {
    try {
      const { text, blur } = req.query;

      if (!text) {
        return res.status(400).json({
          status: false,
          error: "Parameter text wajib diisi. Contoh: /tools/brat?text=good morning 🌅",
        });
      }

      // brat-canvas adalah ESM, gunakan dynamic import
      const { bratGen } = await import("brat-canvas");

      const blurValue = blur !== undefined ? Number(blur) : 0;

      const buf = await bratGen(text, { BLUR: blurValue });

      res.set({
        "Content-Type": "image/png",
        "Content-Length": buf.length,
        "Cache-Control": "no-cache",
      });

      res.send(buf);

    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message || "Gagal generate brat image",
      });
    }
  });

};
