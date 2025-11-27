// vipManager.js
const prisma = require("./database");

const DEFAULT_DAYS = 30;
// Nota: GUILD_ID é usado apenas para buscar membros no Discord, não no Banco de Dados agora.
const GUILD_ID = process.env.GUILD_ID;

module.exports = {
  MAX_FRIENDS: 100,

  /**
   * Adiciona um novo usuário como VIP.
   */
  addVip: async (userId, days = DEFAULT_DAYS) => {
    try {
      // Verifica se já existe (Busca apenas pelo userId, pois é bot único)
      const existing = await prisma.vip.findUnique({
        where: { userId: userId },
      });
      if (existing) return false;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      await prisma.vip.create({
        data: {
          userId,
          // guildId REMOVIDO pois não existe no seu schema atual
          tier: "default",
          since: now,
          expiresAt: expiresAt,
        },
      });
      return true;
    } catch (e) {
      console.error("[DB ERROR] addVip:", e);
      return false;
    }
  },

  /**
   * Adiciona tempo ao VIP.
   */
  addVipTime: async (userId, days) => {
    try {
      const vip = await prisma.vip.findUnique({
        where: { userId: userId },
      });
      if (!vip) return false;

      const now = new Date();
      const baseTime = vip.expiresAt > now ? vip.expiresAt : now;
      const newExpiresAt = new Date(
        baseTime.getTime() + days * 24 * 60 * 60 * 1000
      );

      const updated = await prisma.vip.update({
        where: { userId: userId },
        data: { expiresAt: newExpiresAt },
      });

      return updated.expiresAt.getTime();
    } catch (e) {
      console.error("[DB ERROR] addVipTime:", e);
      return false;
    }
  },

  /**
   * Remove VIP e limpa amigos.
   */
  removeVip: async (userId) => {
    try {
      const vip = await prisma.vip.findUnique({
        where: { userId: userId },
        include: { friends: true },
      });

      if (!vip) return { success: false };

      await prisma.vip.delete({
        where: { userId: userId },
      });

      return {
        success: true,
        friendsToRemove: vip.friends.map((f) => f.friendId),
        customRoleId: vip.customRoleId,
        customChannelId: vip.customChannelId,
      };
    } catch (e) {
      console.error("[DB ERROR] removeVip:", e);
      return { success: false };
    }
  },

  /**
   * Verifica expirados e limpa.
   */
  checkExpiredVips: async (client) => {
    try {
      const now = new Date();
      // AQUI ESTAVA O ERRO: Removemos o filtro 'guildId'
      const expiredVips = await prisma.vip.findMany({
        where: {
          expiresAt: { lt: now }, // Pega todos os vips vencidos do banco
        },
      });

      if (expiredVips.length === 0) return;
      console.log(
        `[VIP SYSTEM] Encontrados ${expiredVips.length} VIPs expirados.`
      );

      const guild = client.guilds.cache.get(GUILD_ID);
      const vipRoleId = process.env.VIP_ROLE_ID;

      for (const vip of expiredVips) {
        const result = await module.exports.removeVip(vip.userId);

        if (result.success && guild) {
          const member = await guild.members
            .fetch(vip.userId)
            .catch(() => null);
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
    } catch (e) {
      console.error("[DB ERROR] checkExpiredVips:", e);
    }
  },

  /**
   * Retorna dados formatados para o Bot.
   */
  getVipData: async (userId) => {
    try {
      const vip = await prisma.vip.findUnique({
        where: { userId: userId },
        include: { friends: true },
      });

      if (!vip) return null;

      return {
        tier: vip.tier,
        since: vip.since.getTime(),
        expiresAt: vip.expiresAt ? vip.expiresAt.getTime() : null,
        customRoleId: vip.customRoleId,
        customChannelId: vip.customChannelId,
        friends: vip.friends.map((f) => f.friendId),
      };
    } catch (e) {
      console.error("[DB ERROR] getVipData:", e);
      return null;
    }
  },

  /**
   * Atualiza dados (Cargo/Canal).
   */
  updateVipData: async (userId, updates) => {
    try {
      await prisma.vip.update({
        where: { userId: userId },
        data: updates,
      });
      return true;
    } catch (e) {
      console.error("[DB ERROR] updateVipData:", e);
      return false;
    }
  },

  // --- AMIGOS ---

  addFriend: async (vipId, friendId) => {
    try {
      const vip = await prisma.vip.findUnique({
        where: { userId: vipId },
        include: { friends: true },
      });

      if (!vip) return { success: false, msg: "Você não é VIP." };

      if (vip.friends.some((f) => f.friendId === friendId)) {
        return { success: false, msg: "Este usuário já está na sua lista." };
      }

      // Cria relação (Sem guildId)
      await prisma.vipFriend.create({
        data: {
          friendId,
          ownerId: vipId,
        },
      });

      return { success: true };
    } catch (e) {
      if (e.code === "P2002")
        return { success: false, msg: "Erro: Usuário já adicionado." };
      console.error("[DB ERROR] addFriend:", e);
      return { success: false, msg: "Erro de banco de dados." };
    }
  },

  removeFriend: async (vipId, friendId) => {
    try {
      // Remove a relação (Sem guildId)
      const result = await prisma.vipFriend.deleteMany({
        where: {
          ownerId: vipId,
          friendId: friendId,
        },
      });

      if (result.count === 0) {
        return { success: false, msg: "Este usuário não está na sua lista." };
      }

      return { success: true };
    } catch (e) {
      console.error("[DB ERROR] removeFriend:", e);
      return { success: false, msg: "Erro ao remover." };
    }
  },
};
