const axios = require('axios');

const APIS = {
    users: 'https://users.roblox.com',
    games: 'https://games.roblox.com',
    badges: 'https://badges.roblox.com',
    friends: 'https://friends.roblox.com',
    presence: 'https://presence.roblox.com',
    avatar: 'https://thumbnails.roblox.com',
    groups: 'https://groups.roblox.com'
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getUserId(username) {
    const response = await axios.post(`${APIS.users}/v1/usernames/users`, {
        usernames: [username],
        excludeBannedUsers: false
    }, { headers: HEADERS });
    
    if (!response.data.data || !response.data.data.length) {
        throw new Error(`User "${username}" tidak ditemukan`);
    }
    return response.data.data[0];
}

async function getProfile(userId) {
    await delay(500);
    const response = await axios.get(`${APIS.users}/v1/users/${userId}`, { headers: HEADERS });
    return response.data;
}

async function getPresence(userId) {
    await delay(500);
    try {
        const response = await axios.post(`${APIS.presence}/v1/presence/users`, 
            { userIds: [userId] }, 
            { headers: { ...HEADERS, 'Content-Type': 'application/json' } }
        );
        const p = response.data.userPresences?.[0] || {};
        const statusMap = { 0: 'Offline', 1: 'Online (Website)', 2: 'In-Game', 3: 'In Studio' };
        return {
            status: statusMap[p.userPresenceType] || 'Unknown',
            lastOnline: p.lastOnline || null,
            gameId: p.gameId || null,
            placeId: p.placeId || null
        };
    } catch {
        return { status: 'Unknown', lastOnline: null, gameId: null, placeId: null };
    }
}

async function getFriends(userId) {
    await delay(500);
    const [friends, followers, following] = await Promise.all([
        axios.get(`${APIS.friends}/v1/users/${userId}/friends/count`, { headers: HEADERS }).catch(() => ({ data: { count: 0 } })),
        axios.get(`${APIS.friends}/v1/users/${userId}/followers/count`, { headers: HEADERS }).catch(() => ({ data: { count: 0 } })),
        axios.get(`${APIS.friends}/v1/users/${userId}/followings/count`, { headers: HEADERS }).catch(() => ({ data: { count: 0 } }))
    ]);
    return {
        friends: friends.data.count || 0,
        followers: followers.data.count || 0,
        following: following.data.count || 0
    };
}

async function getGames(userId) {
    await delay(500);
    const response = await axios.get(`${APIS.games}/v2/users/${userId}/games?limit=50&sortOrder=Asc`, { headers: HEADERS });
    return (response.data.data || []).map(g => ({
        id: g.id,
        name: g.name,
        description: g.description || null,
        playing: g.playing || 0,
        visits: g.visits || 0,
        created: g.created || null,
        updated: g.updated || null
    }));
}

async function getBadges(userId) {
    await delay(500);
    const response = await axios.get(`${APIS.badges}/v1/users/${userId}/badges?limit=100&sortOrder=Desc`, { headers: HEADERS });
    return (response.data.data || []).map(b => ({
        id: b.id,
        name: b.name,
        description: b.description || null,
        enabled: b.enabled,
        awarded: b.statistics?.awarder?.Count || 0
    }));
}

async function getGroups(userId) {
    await delay(500);
    const response = await axios.get(`${APIS.groups}/v1/users/${userId}/groups/roles`, { headers: HEADERS });
    return (response.data.data || []).map(g => ({
        id: g.group?.id,
        name: g.group?.name,
        role: g.role?.name,
        rank: g.role?.rank
    }));
}

async function getAvatar(userId) {
    await delay(500);
    const response = await axios.get(`${APIS.avatar}/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`, { headers: HEADERS });
    return response.data.data?.[0]?.imageUrl || null;
}

async function stalk(username) {
    const userBase = await getUserId(username);
    const userId = userBase.id;

    const [profile, presence, social, games, badges, groups, avatar] = await Promise.all([
        getProfile(userId).catch(() => null),
        getPresence(userId).catch(() => null),
        getFriends(userId).catch(() => ({ friends: 0, followers: 0, following: 0 })),
        getGames(userId).catch(() => []),
        getBadges(userId).catch(() => []),
        getGroups(userId).catch(() => []),
        getAvatar(userId).catch(() => null)
    ]);

    const createdDate = profile?.created ? new Date(profile.created).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    }) : null;

    return {
        user_id: userId,
        username: profile?.name || username,
        display_name: profile?.displayName || null,
        description: profile?.description || null,
        created: createdDate,
        is_banned: profile?.isBanned || false,
        avatar: avatar,
        presence: presence,
        social: social,
        games: { total: games.length, list: games.slice(0, 10) },
        badges: { total: badges.length, list: badges.slice(0, 10) },
        groups: { total: groups.length, list: groups.slice(0, 10) }
    };
}

module.exports = (app) => {
    app.get('/stalker/roblox', async (req, res) => {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "username" diperlukan'
            });
        }

        try {
            const result = await stalk(username);
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });
        } catch (error) {
            console.error(error);
            const status = error.response?.status || 500;
            res.status(status).json({
                status: false,
                error: error.message || 'Gagal mengambil data Roblox'
            });
        }
    });
};
