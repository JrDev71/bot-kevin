// vipManager.js
const fs = require("fs");
const path = require("path");

const VIP_FILE = path.resolve(__dirname, "vipData.json");
// MAX_FRIENDS removido ou mantido alto para não limitar
const MAX_FRIENDS = 100;

function loadVipData() {
  if (!fs.existsSync(VIP_FILE)) return { vips: {}, friends: {} };
  try {
    return JSON.parse(fs.readFileSync(VIP_FILE, "utf-8"));
  } catch (e) {
    return { vips: {}, friends: {} };
  }
}

function saveVipData(data) {
  fs.writeFileSync(VIP_FILE, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
  MAX_FRIENDS,

  // --- ADICIONAR VIP (DONO) ---
  addVip: (userId, days = 30) => {
    const data = loadVipData();
    if (data.vips[userId]) return false;

    const now = Date.now();
    const durationMs = days * 24 * 60 * 60 * 1000;

    data.vips[userId] = {
      tier: "default",
      since: now,
      expiresAt: now + durationMs,
      friends: [],
      customRoleId: null,
      customChannelId: null,
    };
    saveVipData(data);
    return true;
  },

  // --- RENOVAR VIP ---
  addVipTime: (userId, days) => {
    const data = loadVipData();
    if (!data.vips[userId]) return false;

    const durationMs = days * 24 * 60 * 60 * 1000;
    const baseTime =
      data.vips[userId].expiresAt > Date.now()
        ? data.vips[userId].expiresAt
        : Date.now();

    data.vips[userId].expiresAt = baseTime + durationMs;
    saveVipData(data);
    return data.vips[userId].expiresAt;
  },

  // --- REMOVER VIP (DONO) ---
  removeVip: (userId) => {
    const data = loadVipData();
    if (!data.vips[userId]) return { success: false };

    const vipData = data.vips[userId];
    const friends = vipData.friends || [];

    // Remove este VIP da lista de 'friends' (Reverse Map)
    friends.forEach((friendId) => {
      if (data.friends[friendId]) {
        // Se for array (novo formato), filtra. Se for string (velho), deleta.
        if (Array.isArray(data.friends[friendId])) {
          data.friends[friendId] = data.friends[friendId].filter(
            (id) => id !== userId
          );
          if (data.friends[friendId].length === 0)
            delete data.friends[friendId];
        } else {
          delete data.friends[friendId];
        }
      }
    });

    delete data.vips[userId];
    saveVipData(data);

    return {
      success: true,
      friendsToRemove: friends,
      customRoleId: vipData.customRoleId,
      customChannelId: vipData.customChannelId,
    };
  },

  // --- CHECKER DE VALIDADE ---
  checkExpiredVips: async (client) => {
    const data = loadVipData();
    const now = Date.now();
    const expiredUsers = [];

    for (const userId in data.vips) {
      if (data.vips[userId].expiresAt && data.vips[userId].expiresAt < now) {
        expiredUsers.push(userId);
      }
    }

    if (expiredUsers.length === 0) return;
    console.log(
      `[VIP SYSTEM] Encontrados ${expiredUsers.length} VIPs expirados.`
    );

    const guildId = process.env.GUILD_ID;
    const guild = client.guilds.cache.get(guildId);
    const vipRoleId = process.env.VIP_ROLE_ID;

    for (const userId of expiredUsers) {
      const result = module.exports.removeVip(userId);

      if (result.success && guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member && vipRoleId)
          await member.roles.remove(vipRoleId).catch(() => {});

        if (result.customRoleId) {
          const role = guild.roles.cache.get(result.customRoleId);
          if (role) await role.delete("VIP Expirado").catch(() => {});
        }
        if (result.customChannelId) {
          const channel = guild.channels.cache.get(result.customChannelId);
          if (channel) await channel.delete("VIP Expirado").catch(() => {});
        }
      }
    }
  },

  isVip: (userId) => {
    const data = loadVipData();
    return !!data.vips[userId];
  },
  getVipData: (userId) => {
    const data = loadVipData();
    return data.vips[userId];
  },

  updateVipData: (userId, updates) => {
    const data = loadVipData();
    if (!data.vips[userId]) return false;
    data.vips[userId] = { ...data.vips[userId], ...updates };
    saveVipData(data);
    return true;
  },

  // --- SISTEMA DE AMIGOS (MULTI-TAG) ---

  addFriend: (vipId, friendId) => {
    const data = loadVipData();

    if (!data.vips[vipId])
      return { success: false, msg: "Você não possui um plano VIP ativo." };

    // Verifica se já é amigo DESTE vip específico
    if (data.vips[vipId].friends.includes(friendId)) {
      return {
        success: false,
        msg: "Este usuário já está na sua lista de convidados.",
      };
    }

    // Adiciona na lista do VIP
    data.vips[vipId].friends.push(friendId);

    // Atualiza o mapa reverso (suporta múltiplos VIPs agora)
    if (!data.friends[friendId]) {
      data.friends[friendId] = [vipId];
    } else if (Array.isArray(data.friends[friendId])) {
      if (!data.friends[friendId].includes(vipId)) {
        data.friends[friendId].push(vipId);
      }
    } else {
      // Migração de formato antigo (string) para novo (array)
      data.friends[friendId] = [data.friends[friendId], vipId];
    }

    saveVipData(data);
    return { success: true };
  },

  removeFriend: (vipId, friendId) => {
    const data = loadVipData();

    if (!data.vips[vipId]) return { success: false, msg: "Você não é VIP." };

    if (!data.vips[vipId].friends.includes(friendId)) {
      return {
        success: false,
        msg: "Este usuário não está na sua lista de convidados.",
      };
    }

    // Remove da lista do VIP
    data.vips[vipId].friends = data.vips[vipId].friends.filter(
      (id) => id !== friendId
    );

    // Remove do mapa reverso
    if (data.friends[friendId] && Array.isArray(data.friends[friendId])) {
      data.friends[friendId] = data.friends[friendId].filter(
        (id) => id !== vipId
      );
      if (data.friends[friendId].length === 0) delete data.friends[friendId];
    } else {
      // Fallback para formato antigo
      delete data.friends[friendId];
    }

    saveVipData(data);
    return { success: true };
  },
};
