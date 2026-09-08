const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");

const base = {
  token: "https://snapdouyin.app",
  videoDl: "https://snapdouyin.app/wp-json/mx-downloader/video-data/"
};

async function token() {
  const { data } = await axios.get(base.token);
  const $ = cheerio.load(data);
  return $("#token").val();
}

function generateHash(url, key) {
  return Buffer.from(url).toString("base64") + (url.length + 1000) + Buffer.from(key).toString("base64");
}

async function douyin(url) {
  try {
    const d = new FormData();
    const tk = await token();

    d.append("url", url);
    d.append("token", tk);
    d.append("hash", generateHash(url, "aio-dl"));

    const { data } = await axios.post(base.videoDl, d, {
      headers: {
        ...d.getHeaders()
      }
    });

    return data;
  } catch (error) {
    return {
      status: false,
      message: error.message
    };
  }
}

module.exports = function (app) {
  app.get('/download/douyin', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: 'Parameter url kosong!' });

    try {
      const result = await douyin(url);
      res.status(200).json({
        status: true,
        result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message
      });
    }
  });
}
