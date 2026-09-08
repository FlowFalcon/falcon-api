const { fetchSite } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.cafe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/donghua/detail', async (req, res) => {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "slug" diperlukan (contoh: ?slug=renegade-immortal)'
      });
    }
    
    try {
      const url = `${BASE_URL}/${slug}/`;
      const data = await fetchSite(url);
      
      const $ = cheerio.load(data);
      
      const detail = {
        title: "",
        alternative: "",
        rating: "",
        status: "",
        type: "",
        studio: "",
        network: "",
        releaseDate: "",
        duration: "",
        season: "",
        country: "",
        totalEpisodes: "",
        subber: "",
        genres: [],
        sinopsis: "",
        cover: null,
        episodes: []
      };
      
      // ========== AMBIL DARI STRUKTUR BARU ==========
      detail.title = $(".bixbox .infox h1.entry-title").text().trim();
      detail.alternative = $(".bixbox .infox .alter").text().trim();
      detail.cover = $(".bixbox .thumb img").attr("src") || null;
      
      // Rating
      const ratingText = $(".bixbox .rating strong").text().trim();
      detail.rating = ratingText.replace("Rating ", "");
      
      // Info dari .spe span
      $(".bixbox .info-content .spe span").each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes("Status:")) detail.status = text.replace("Status:", "").trim();
        if (text.includes("Tipe:")) detail.type = text.replace("Tipe:", "").trim();
        if (text.includes("Studio:")) detail.studio = text.replace("Studio:", "").trim();
        if (text.includes("Network:")) detail.network = text.replace("Network:", "").trim();
        if (text.includes("Tanggal rilis:")) detail.releaseDate = text.replace("Tanggal rilis:", "").trim();
        if (text.includes("Durasi:")) detail.duration = text.replace("Durasi:", "").trim();
        if (text.includes("Season:")) detail.season = text.replace("Season:", "").trim();
        if (text.includes("Negara:")) detail.country = text.replace("Negara:", "").trim();
        if (text.includes("Episode:")) detail.totalEpisodes = text.replace("Episode:", "").trim();
        if (text.includes("Subber:")) detail.subber = text.replace("Subber:", "").trim();
      });
      
      // Genre
      $(".bixbox .genxed a").each((_, el) => {
        detail.genres.push($(el).text().trim());
      });
      
      // Sinopsis
      detail.sinopsis = $(".bixbox .desc").text().trim();
      
      // ========== AMBIL EPISODE ==========
      const tempEpisodes = [];
      $(".eplister ul li, .listeps ul li").each((_, el) => {
        const episodeTitle = $(el).find(".epl-title, .lchx a").text().trim();
        const episodeLink = $(el).find("a").attr("href");
        const episodeDate = $(el).find(".epl-date, .date").text().trim();
        
        if (episodeTitle && episodeLink) {
          tempEpisodes.push({
            title: episodeTitle,
            url: episodeLink,
            date: episodeDate || null
          });
        }
      });
      
      // ========== PERBAIKI URUTAN DAN NUMBER ==========
      // Balik urutan (karena biasanya episode terbaru di atas)
      tempEpisodes.reverse();
      
      // Tambahkan number yang benar (1, 2, 3, ...)
      detail.episodes = tempEpisodes.map((ep, index) => ({
        number: index + 1,
        title: ep.title,
        url: ep.url,
        date: ep.date
      }));
      
      // ========== AMBIL TOTAL EPISODE DARI `totalEpisodes` ATAU DARI EPISODE YANG DISCRAOE ==========
      if (!detail.totalEpisodes || detail.totalEpisodes === "") {
        detail.totalEpisodes = detail.episodes.length;
      }
      
      res.json({
        status: true,
        creator: getCreator(),
        result: detail
      });
      
    } catch (error) {
      console.error('[Detail Error]', error.message);
      
      if (error.response?.status === 403) {
        return res.status(403).json({
          status: false,
          creator: getCreator(),
          error: 'Akses ditolak oleh Cloudflare'
        });
      }
      
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
