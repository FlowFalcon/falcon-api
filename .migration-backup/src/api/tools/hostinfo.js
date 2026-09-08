const axios = require("axios");
const cheerio = require("cheerio");

async function hostInfo(link) {
  try {
    const res = await axios.get(`https://check-host.net/ip-info?host=${link}`);
    const $ = cheerio.load(res.data);

    const ip = $(".break-all").eq(1).text();
    const name = $(".break-all").eq(2).text();
    const range = $(".break-all").eq(3).text();
    const isp = $(".break-all").eq(4).text();
    const organisation = $(".break-all").eq(5).text();
    const region = $(".break-all").eq(6).text().trim();
    const city = $(".break-all").eq(7).text().trim();
    const tzone = $(".break-all").eq(8).text().trim();
    const ltime = $(".break-all").eq(9).text().trim();
    const pcode = $(".break-all").eq(10).text();

    return {
      ip,
      name,
      range,
      isp,
      organisation,
      region,
      city,
      timezone: tzone,
      localtime: ltime,
      postalcode: pcode
    };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = function (app) {
  app.get("/tools/hostinfo", async (req, res) => {
    const { host } = req.query;
    if (!host) return res.status(400).json({ status: false, msg: "Masukin host-nya, bro!" });

    const result = await hostInfo(host);
    res.json({
      status: true,
      result
    });
  });
};