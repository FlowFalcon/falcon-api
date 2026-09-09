const { fetchSite, mapUpstreamError } = require('./fetchSite');
const cheerio = require('cheerio');

const BASE_URL = "https://donghub.vip";

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

      // ========== INFO UTAMA (donghub pakai .bigcontent, anichin pakai .bixbox) ==========
      detail.title = $(".bixbox .infox h1.entry-title, .bigcontent .infox h1.entry-title").first().text().trim();
      detail.alternative = $(".bixbox .infox .alter").text().trim();
      detail.cover = $(".bixbox .thumb img").attr("src")
        || $(".bigcontent .thumb img").attr("src")
        || $(".bigcover img").attr("src")
        || $(".bixbox .thumb img").attr("data-src") || null;

      // Rating
      const ratingText = $(".bixbox .rating strong, .bigcontent .rating strong").first().text().trim();
      detail.rating = ratingText.replace("Rating ", "");

      // Info dari .spe span — bilingual: label EN (donghub) + ID (anichin)
      $(".bixbox .info-content .spe span, .bigcontent .info-content .spe span, .bixbox .infox .spe span, .bigcontent .infox .spe span").each((_, el) => {
        const text = $(el).text().trim();
        const pick = (en, id) => text.includes(en + ":") ? text.replace(en + ":", "").trim()
          : text.includes(id + ":") ? text.replace(id + ":", "").trim() : null;
        const set = (v, fn) => { if (v) fn(v); };
        set(pick("Status", "Status"), (v) => detail.status = v);
        set(pick("Type", "Tipe"), (v) => detail.type = v);
        set(pick("Studio", "Studio"), (v) => detail.studio = v);
        set(pick("Network", "Network"), (v) => detail.network = v);
        set(pick("Released", "Tanggal rilis"), (v) => detail.releaseDate = v);
        set(pick("Duration", "Durasi"), (v) => detail.duration = v);
        set(pick("Season", "Season"), (v) => detail.season = v);
        set(pick("Country", "Negara"), (v) => detail.country = v);
        set(pick("Episodes", "Episode"), (v) => detail.totalEpisodes = v);
        set(pick("Fansub", "Subber"), (v) => detail.subber = v);
      });

      // Genre
      $(".bixbox .genxed a, .bigcontent .genxed a").each((_, el) => {
        detail.genres.push($(el).text().trim());
      });

      // Sinopsis
      detail.sinopsis = $(".bixbox .desc").first().text().trim()
        || $(".bixbox.synp .entry-content").first().text().trim()
        || $(".bigcontent .desc").first().text().trim();

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

      // ========== TOTAL EPISODE ==========
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
      const mapped = mapUpstreamError(error);
      return res.status(mapped.code).json({
        status: false,
        creator: getCreator(),
        ...mapped.body
      });
    }
  });
};
