const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

// Creator name dari global atau default
const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

const createInstance = () => {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    timeout: 30000,
  });
};

class AnichinCare {
  constructor() {
    this.client = createInstance();
  }

  async home() {
    const response = await this.client.get("/");
    const $ = cheerio.load(response.data);
    const data = {
      slider: [],
      popular: [],
      latest: [],
    };

    $("#slidertwo .swiper-slide.item").each((_, el) => {
      const title = $(el).find("h2 a").attr("data-jtitle") || $(el).find("h2 a").text().trim();
      const link = $(el).find("h2 a").attr("href") || "";
      const backdrop = $(el).find(".backdrop").attr("style")?.match(/url\(['"]?([^'")]+)/)?.[1] || null;
      const description = $(el).find("p").not(":empty").last().text().trim();

      if (title && link) {
        data.slider.push({
          title,
          slug: this.extractSlug(link),
          url: link.startsWith("http") ? link : `${BASE_URL}${link}`,
          backdrop,
          description,
        });
      }
    });

    $(".hothome + .listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem($, el);
      if (item) data.popular.push(item);
    });

    $(".latesthome + .listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem($, el);
      if (item) data.latest.push(item);
    });

    return data;
  }

  async slider() {
    const response = await this.client.get("/");
    const $ = cheerio.load(response.data);
    const data = [];

    $("#slidertwo .swiper-slide.item").each((_, el) => {
      const title = $(el).find("h2 a").attr("data-jtitle") || $(el).find("h2 a").text().trim();
      const link = $(el).find("h2 a").attr("href") || "";
      const backdrop = $(el).find(".backdrop").attr("style")?.match(/url\(['"]?([^'")]+)/)?.[1] || null;
      const description = $(el).find("p").not(":empty").last().text().trim();

      if (title && link) {
        data.push({
          title,
          slug: this.extractSlug(link),
          url: link.startsWith("http") ? link : `${BASE_URL}${link}`,
          backdrop,
          description,
        });
      }
    });

    return data;
  }

  async populer() {
    const response = await this.client.get("/");
    const $ = cheerio.load(response.data);
    const data = [];

    $(".hothome + .listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem($, el);
      if (item) data.push(item);
    });

    return data;
  }

  async terbaru(page = 1) {
    const response = await this.client.get(`/anime/?status=&type=&order=update&page=${page}`);
    const $ = cheerio.load(response.data);
    const data = [];

    $(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem($, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination($);
    return { results: data, pagination };
  }

  async completed(page = 1) {
    const response = await this.client.get(`/anime/?status=completed&type=&order=update&page=${page}`);
    const $ = cheerio.load(response.data);
    const data = [];

    $(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem($, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination($);
    return { results: data, pagination };
  }

  async ongoing(page = 1) {
    const response = await this.client.get(`/anime/?status=ongoing&type=&order=update&page=${page}`);
    const $ = cheerio.load(response.data);
    const data = [];

    $(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem($, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination($);
    return { results: data, pagination };
  }

  async movie(page = 1) {
    const response = await this.client.get(`/anime/?status=&type=movie&order=update&page=${page}`);
    const $ = cheerio.load(response.data);
    const data = [];

    $(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem($, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination($);
    return { results: data, pagination };
  }

  async search(query, page = 1) {
    const response = await this.client.get(`/page/${page}/?s=${encodeURIComponent(query)}`);
    const $ = cheerio.load(response.data);
    const data = [];

    $(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem($, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination($);
    return { query, results: data, pagination };
  }

  async detail(slug) {
    const response = await this.client.get(`/${slug}/`);
    const $ = cheerio.load(response.data);
    const data = {
      title: "",
      japaneseTitle: "",
      synopsis: "",
      type: "",
      status: "",
      genres: [],
      episodes: [],
      cover: null,
    };

    const info = $(".infox");
    data.title = info.find(".entry-title").text().trim() || info.find("h1").first().text().trim();
    data.japaneseTitle = info.find(".jtitle").text().trim() || null;

    const synopsisText = $(".entry-content").find("p").first().text().trim();
    data.synopsis = synopsisText || $(".desc").text().trim() || null;

    info.find(".spe span").each((_, el) => {
      const label = $(el).find(".btl").text().trim().toLowerCase();
      const value = $(el).contents().not("span").text().trim();

      if (label.includes("type")) {
        data.type = value || null;
      } else if (label.includes("status")) {
        data.status = value || null;
      } else if (label.includes("genre")) {
        $(el).find("a").each((_, a) => {
          const genre = $(a).text().trim();
          if (genre) data.genres.push(genre);
        });
      }
    });

    const coverImg = $(".thumb img").attr("src") || $(".thumb img").attr("data-src");
    data.cover = coverImg || null;

    $(".eplister ul li").each((_, el) => {
      const title = $(el).find(".epl-title").text().trim();
      const link = $(el).find("a").attr("href") || "";
      const date = $(el).find(".epl-date").text().trim() || null;

      if (title && link) {
        data.episodes.push({
          title,
          slug: this.extractSlug(link),
          url: link.startsWith("http") ? link : `${BASE_URL}${link}`,
          date,
        });
      }
    });

    return data;
  }

  async episode(slug) {
    const response = await this.client.get(`/${slug}/`);
    const $ = cheerio.load(response.data);
    const data = {
      title: "",
      episodeNumber: "",
      releasedDate: "",
      author: "",
      series: null,
      cover: null,
      prevEpisode: null,
      nextEpisode: null,
      streams: [],
    };

    data.title = $(".entry-title").text().trim() || $("h1").first().text().trim();
    data.episodeNumber = $('[itemprop="episodeNumber"]').attr("content") || null;
    data.releasedDate = $(".updated").text().trim() || null;
    data.author = $(".vcard a").text().trim() || null;

    const seriesLink = $(".lm .year a").attr("href");
    if (seriesLink) {
      data.series = {
        name: $(".lm .year a").text().trim(),
        slug: this.extractSlug(seriesLink),
        url: seriesLink.startsWith("http") ? seriesLink : `${BASE_URL}${seriesLink}`,
      };
    }

    const coverImg = $('[itemprop="image"] img').attr("src") || $(".thumb img").attr("src") || null;
    data.cover = coverImg;

    const prevLink = $(".naveps .nvs:first-child a:not(.nolink)").attr("href") || null;
    const nextLink = $(".naveps .nvs:last-child a").attr("href") || null;

    if (prevLink) {
      data.prevEpisode = {
        slug: this.extractSlug(prevLink),
        url: prevLink.startsWith("http") ? prevLink : `${BASE_URL}${prevLink}`,
      };
    }

    if (nextLink) {
      data.nextEpisode = {
        slug: this.extractSlug(nextLink),
        url: nextLink.startsWith("http") ? nextLink : `${BASE_URL}${nextLink}`,
      };
    }

    $(".mirror option").each((_, el) => {
      const serverName = $(el).text().trim();
      const value = $(el).attr("value") || "";

      if (value && serverName !== "Select Video Server") {
        const decoded = Buffer.from(value, "base64").toString("utf-8");
        const iframeMatch = decoded.match(/<iframe[^>]*src=["']([^"']+)["']/i);

        if (iframeMatch && iframeMatch[1]) {
          data.streams.push({
            server: serverName,
            url: iframeMatch[1],
          });
        }
      }
    });

    return data;
  }

  async genre(genreName, page = 1) {
    const response = await this.client.get(`/genre/${genreName}?page=${page}`);
    const $ = cheerio.load(response.data);
    const data = [];

    $(".listupd .bs").each((_, el) => {
      const item = this.parseAnimeItem($, el);
      if (item) data.push(item);
    });

    const pagination = this.parsePagination($);
    return { genre: genreName, results: data, pagination };
  }

  async genres() {
    const response = await this.client.get("/anime/?status=&type=&order=update");
    const $ = cheerio.load(response.data);
    const data = [];

    $(".filter-ser .genx option").each((_, el) => {
      const value = $(el).attr("value");
      const label = $(el).text().trim();
      if (value && label) {
        data.push({ name: label, slug: value, url: `${BASE_URL}/genre/${value}` });
      }
    });

    return data;
  }

  parseAnimeItem($, el) {
    const $el = $(el);
    const link = $el.find(".bsx a").attr("href") || "";
    const title = $el.find(".tt").text().trim() || $el.find("img").attr("title") || "";
    const episode = $el.find(".epx").text().trim() || null;
    const type = $el.find(".typez").text().trim() || null;
    const imgSrc = $el.find("img").attr("src") || $el.find("img").attr("data-src") || null;
    const isHot = $el.find(".hotbadge").length > 0;

    if (!title || !link) return null;

    return {
      title,
      slug: this.extractSlug(link),
      url: link.startsWith("http") ? link : `${BASE_URL}${link}`,
      episode,
      type,
      thumbnail: imgSrc,
      isHot,
    };
  }

  parsePagination($) {
    const data = { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false };

    const currentPage = $(".pagination .current").text().trim();
    const totalPages = $(".pagination .pages").text().match(/(\d+)$/)?.[1];

    if (currentPage) data.currentPage = parseInt(currentPage, 10) || 1;
    if (totalPages) data.totalPages = parseInt(totalPages, 10) || 1;

    data.hasNext = $(".nextpage").length > 0;
    data.hasPrev = $(".prevpage").length > 0;

    return data;
  }

  extractSlug(url) {
    if (!url) return "";
    try {
      const pathname = new URL(url).pathname;
      return pathname.replace(/^\/|\/$/g, "");
    } catch {
      return url.replace(/^\/|\/$/g, "");
    }
  }

  async getStreamUrl(streamUrl) {
    const response = await this.client.get(streamUrl, { headers: { Referer: BASE_URL } });
    const $ = cheerio.load(response.data);

    const data = { url: streamUrl, metadata: {} };

    const videoModule = $('[data-module="OKVideo"]').attr("data-options");
    const movieId = $('[data-module="OKVideo"]').attr("data-movie-id");
    const movieOptions = $('[data-module="OKVideo"]').attr("data-movie-options");

    if (movieId) data.metadata.movieId = movieId;
    if (movieOptions) {
      try { data.metadata.options = JSON.parse(movieOptions); } catch { data.metadata.optionsRaw = movieOptions; }
    }
    if (videoModule) {
      try {
        data.metadata.video = JSON.parse(videoModule);
        if (data.metadata.video?.flashvars?.metadata) data.metadata.video = JSON.parse(data.metadata.video.flashvars.metadata);
      } catch { data.metadata.videoRaw = videoModule; }
    }

    return data;
  }

  // Extract MP4 langsung dari URL embed
  async getDirectMp4(embedUrl) {
    try {
      let mp4Url = null;
      let quality = null;

      // OK.ru
      if (embedUrl.includes('ok.ru')) {
        const { data } = await axios.get(embedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': BASE_URL }
        });
        const match = data.match(/https?:\/\/[^"']+\.mp4[^"']*/);
        if (match) {
          mp4Url = match[0];
          quality = 'OK.ru';
        }
      }
      
      // Google Drive
      else if (embedUrl.includes('drive.google.com')) {
        const match = embedUrl.match(/\/d\/([^\/]+)/);
        if (match) {
          mp4Url = `https://drive.google.com/uc?export=download&id=${match[1]}`;
          quality = 'Google Drive';
        }
      }
      
      // Youtube
      else if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
        const videoId = embedUrl.match(/(?:youtu\.be\/|v=|\/v\/|embed\/)([a-zA-Z0-9_-]+)/)?.[1];
        if (videoId) {
          mp4Url = `https://www.youtube.com/watch?v=${videoId}`;
          quality = 'YouTube';
        }
      }
      
      // Vidoza
      else if (embedUrl.includes('vidoza.net')) {
        const { data } = await axios.get(embedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const match = data.match(/sources:\s*\[{file:"([^"]+\.mp4)"/);
        if (match) {
          mp4Url = match[1];
          quality = 'Vidoza';
        }
      }
      
      // Mp4upload
      else if (embedUrl.includes('mp4upload.com')) {
        const { data } = await axios.get(embedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const match = data.match(/file:\s*"([^"]+\.mp4)"/);
        if (match) {
          mp4Url = match[1];
          quality = 'Mp4upload';
        }
      }

      return { success: !!mp4Url, mp4_url: mp4Url, quality, original_url: embedUrl };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export endpoints untuk Express
module.exports = (app) => {
  const api = new AnichinCare();

  // ==================== HOME ====================
  app.get('/anime/anichin/home', async (req, res) => {
    try {
      const result = await api.home();
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== SEARCH ====================
  app.get('/anime/anichin/search', async (req, res) => {
    const { q, page = 1 } = req.query;
    if (!q) return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter "q" diperlukan' });
    try {
      const result = await api.search(q, parseInt(page));
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== DETAIL ====================
  app.get('/anime/anichin/detail', async (req, res) => {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter "slug" diperlukan' });
    try {
      const result = await api.detail(slug);
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== EPISODE (dapatkan streams) ====================
  app.get('/anime/anichin/episode', async (req, res) => {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter "slug" diperlukan' });
    try {
      const result = await api.episode(slug);
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== STREAM METADATA (dari embed URL) ====================
  app.get('/anime/anichin/stream', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter "url" diperlukan' });
    try {
      const result = await api.getStreamUrl(url);
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== DIRECT MP4 (konversi embed ke MP4) ====================
  app.get('/anime/anichin/mp4', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter "url" diperlukan' });
    try {
      const result = await api.getDirectMp4(url);
      if (!result.success) {
        return res.status(404).json({ status: false, creator: getCreator(), error: 'MP4 URL tidak ditemukan' });
      }
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== TERBARU ====================
  app.get('/anime/anichin/terbaru', async (req, res) => {
    const { page = 1 } = req.query;
    try {
      const result = await api.terbaru(parseInt(page));
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== ONGOING ====================
  app.get('/anime/anichin/ongoing', async (req, res) => {
    const { page = 1 } = req.query;
    try {
      const result = await api.ongoing(parseInt(page));
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== COMPLETED ====================
  app.get('/anime/anichin/completed', async (req, res) => {
    const { page = 1 } = req.query;
    try {
      const result = await api.completed(parseInt(page));
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== POPULER ====================
  app.get('/anime/anichin/populer', async (req, res) => {
    try {
      const result = await api.populer();
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== SLIDER ====================
  app.get('/anime/anichin/slider', async (req, res) => {
    try {
      const result = await api.slider();
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== GENRES LIST ====================
  app.get('/anime/anichin/genres', async (req, res) => {
    try {
      const result = await api.genres();
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ==================== GENRE SPECIFIC ====================
  app.get('/anime/anichin/genre', async (req, res) => {
    const { genre, page = 1 } = req.query;
    if (!genre) return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter "genre" diperlukan' });
    try {
      const result = await api.genre(genre, parseInt(page));
      res.json({ status: true, creator: getCreator(), result });
    } catch (error) {
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });
};
