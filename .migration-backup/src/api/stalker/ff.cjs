// stalkff.js - Free Fire Player Stalk / Info
const axios = require("axios");

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

async function stalkFF(uid) {
  const res = await axios.get(`https://www.00cc.eu.cc/freefire-stalk?uid=${uid}`, {
    timeout: 15000,
    headers: {
      "User-Agent": UA,
      "Accept": "application/json",
    },
  });

  const raw = res.data;

  if (!raw.success) {
    return { success: false, code: 404, message: "UID tidak ditemukan" };
  }

  const r = raw.result;

  return {
    success: true,
    code: 200,
    data: {
      basic: {
        uid: r.account_basic_info.uid,
        name: r.account_basic_info.name,
        level: r.account_basic_info.level,
        exp: r.account_basic_info.exp,
        region: r.account_basic_info.region,
        likes: r.account_basic_info.likes,
        honor_score: r.account_basic_info.honor_score,
        title: r.account_basic_info.title_name,
        bio: r.account_basic_info.bio,
        has_elite_pass: r.account_basic_info.has_elite_pass,
      },
      activity: {
        created_at: r.account_activity.created_at,
        last_login: r.account_activity.last_login,
        latest_ob: r.account_activity.most_recent_ob,
        season_id: r.account_activity.season_id,
        bp_badges: r.account_activity.current_bp_badges,
        br_rank: r.account_activity.br_rank,
        br_rank_id: r.account_activity.br_rank_id,
        br_max_rank: r.account_activity.br_max_rank,
        cs_rank: r.account_activity.cs_rank,
        cs_rank_id: r.account_activity.cs_rank_id,
        cs_max_rank: r.account_activity.cs_max_rank,
      },
      social: {
        gender: (r.social_info.gender || "").replace("Gender_", ""),
        language: (r.social_info.language || "").replace("Language_", ""),
        rank_show: (r.social_info.rank_show || "").replace("RankShow_", ""),
        mode_prefer: r.social_info.mode_prefer,
        signature: r.social_info.signature,
      },
      overview: {
        avatar: r.account_overview.avatar_name,
        banner: r.account_overview.banner_name,
        head_pic: r.account_overview.head_pic_name,
        title: r.account_overview.title_name,
        weapon_skin_shows: (r.account_overview.weapon_skin_shows || []).map(w => w.name),
        equipped_skills: (r.account_overview.equipped_skills || []).map(s => s.name),
      },
      equip: {
        profile: (r.equip_items.profile || []).map(i => ({ name: i.name, type: i.type, rare: i.rare })),
        character: (r.equip_items.character || []).map(i => ({ name: i.name, type: i.type, rare: i.rare })),
        outfit: (r.equip_items.outfit || []).map(i => ({ name: i.name, type: i.type, rare: i.rare })),
        weapon: (r.equip_items.weapon || []).map(i => ({ name: i.name, type: i.type, rare: i.rare })),
        pet: (r.equip_items.pet || []).map(i => ({ name: i.name, type: i.type, rare: i.rare })),
      },
      pet: {
        name: r.pet_details.pet_name,
        item_name: r.pet_details.pet_item_name,
        level: r.pet_details.pet_level,
        exp: r.pet_details.pet_exp,
        skin: r.pet_details.skin_name,
        skill: r.pet_details.selected_skill_name,
        equipped: r.pet_details.equipped,
      },
      guild: {
        name: r.guild_info.guild_name,
        id: r.guild_info.guild_id,
        level: r.guild_info.guild_level,
        members: r.guild_info.live_members,
        capacity: r.guild_info.capacity,
        leader: {
          name: r.guild_info.leader.leader_name,
          uid: r.guild_info.leader.leader_uid,
          level: r.guild_info.leader.leader_level,
          br_rank_id: r.guild_info.leader.leader_br_rank_id,
          cs_rank_id: r.guild_info.leader.leader_cs_rank_id,
          last_login: r.guild_info.leader.leader_last_login,
        },
      },
      misc: {
        diamond_cost: r.diamond_cost.diamond_cost,
        profile_image: r.profile_image,
      },
    },
  };
}

module.exports = (app) => {

  // GET /game/stalkff?uid=87980657
  app.get("/stalk/ff", async (req, res) => {
    try {
      const { uid } = req.query;

      if (!uid) {
        return res.status(400).json({
          status: false,
          error: "Parameter uid wajib diisi. Contoh: /game/stalkff?uid=87980657",
        });
      }

      const result = await stalkFF(uid);

      if (!result.success) {
        return res.status(result.code).json({
          status: false,
          error: result.message,
        });
      }

      res.json({
        status: true,
        ...result,
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message || "Gagal mengambil data Free Fire",
      });
    }
  });

};
