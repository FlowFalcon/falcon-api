// tiktok.js - TikTok Stalker (gratis via tikwm.com)
const axios = require("axios");

function formatNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

async function stalkTikTok(username) {
  const url = `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`;
  
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    timeout: 15000
  });
  
  const res = response.data;
  if (res.code !== 0) {
    throw new Error(res.msg || "User TikTok tidak ditemukan.");
  }
  
  const { user, stats } = res.data;
  
  return {
    username: user.uniqueId || username,
    nickname: user.nickname || "",
    avatar: user.avatarLarger || user.avatarMedium || user.avatarThumb || "",
    signature: user.signature || "",
    verified: Boolean(user.verified),
    private: Boolean(user.privateAccount),
    region: user.region || "",
    create_time: user.createTime ? new Date(user.createTime * 1000).toISOString() : null,
    stats: {
      followers: formatNumber(stats.followerCount),
      following: formatNumber(stats.followingCount),
      hearts: formatNumber(stats.heartCount),
      videos: formatNumber(stats.videoCount),
      digg: formatNumber(stats.diggCount),
    },
    sec_uid: user.secUid || "",
    bio_link: user.bioLink?.link || ""
  };
}

function cleanUsername(input = "") {
  return String(input || "")
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i, "")
    .split("?")[0]
    .split("/")[0]
    .trim();
}

module.exports = (app) => {
  
  // GET /stalk/tiktok?user=khaby.lame
  app.get('/stalk/tiktok', async (req, res) => {
    try {
      let { user } = req.query;
      
      if (!user) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter user (username TikTok) wajib diisi'
        });
      }
      
      const cleanUser = cleanUsername(user);
      const result = await stalkTikTok(cleanUser);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: result
      });
      
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'AxlyDev',
        error: error.message
      });
    }
  });
  
  // POST /stalk/tiktok (support JSON body)
  app.post('/stalk/tiktok', async (req, res) => {
    try {
      let { user } = req.body;
      
      if (!user) {
        return res.status(400).json({
          status: false,
          creator: 'AxlyDev',
          error: 'Parameter user (username TikTok) wajib diisi'
        });
      }
      
      const cleanUser = cleanUsername(user);
      const result = await stalkTikTok(cleanUser);
      
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: result
      });
      
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'AxlyDev',
        error: error.message
      });
    }
  });
  
};
