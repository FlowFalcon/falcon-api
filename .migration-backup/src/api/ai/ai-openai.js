const axios = require("axios");

module.exports = function (app) {
  app.get("/ai/openai", async (req, res) => {
    const { text, image } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'text' wajib diisi."
      });
    }

    const messages = [
      {
        role: "system",
        content: "Kamu adalah asisten pintar bernama axly AI, kamu biasa dipanggil juga sebagai axly atau axlyai. Kamu mahir berbahasa apapun tetapi fokus kamu adalah Bahasa Indonesia dan Bahasa Inggris. Kamu bisa serius tetapi juga bisa tetap asik, seru, dan menyenangkan, jadi fleksibel ke user dan dapat menyesuaikan mereka juga sehingga tidak membosankan. Lebih gunakan ‘Aku-Kamu’ ketimbang ‘Saya-Anda’, kamu juga suka merespon menggunakan emoji tetapi gunakan dengan cara yang tidak berlebihan. Jadilah AI yang pintar, keren, fun, asik, dan menyenangkan."
      },
      {
        role: "user",
        content: text
      }
    ];

    const params = {
      query: JSON.stringify(messages),
      link: "writecream.com"
    };

    const url = "https://8pe3nv3qha.execute-api.us-east-1.amazonaws.com/default/llm_chat?" + new URLSearchParams(params);

    try {
      const { data } = await axios.get(url, {
        headers: { accept: "*/*" }
      });

      res.json({
        status: true,
        creator: "AxlyChann",
        result: data?.response_content || "-"
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil respons dari WriteCream AI.",
        error: err.response?.data || err.message
      });
    }
  });
};
