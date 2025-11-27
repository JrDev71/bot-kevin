// vipManager.js
const prisma = require("./database");

const DEFAULT_DAYS = 30;
const GUILD_ID = process.env.GUILD_ID; // Pega o ID do servidor do .env

// --- FUNÇÕES DE GERENCIAMENTO (AGORA SÃO ASYNC) ---

module.exports = {
  // Não precisamos mais de MAX_FRIENDS aqui se for ilimitado no banco,
  // mas manteremos para controle lógico se quiser voltar.
  MAX_FRIENDS: 100,

  /**
   * Adiciona um novo usuário como VIP.
   */
  addVip: async (userId, days = DEFAULT_DAYS) => {
    try {
      // Verifica se já existe
      const existing = await prisma.vip.findUnique({
        where: { userId_guildId: { userId, guildId: GUILD_ID } },
      });
      if (existing) return false;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      await prisma.vip.create({
        data: {
          userId,
          guildId: GUILD_ID,
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
        where: { userId_guildId: { userId, guildId: GUILD_ID } },
      });
      if (!vip) return false;

      const now = new Date();
      // Se já venceu, soma a partir de agora. Se não, soma ao final atual.
      const baseTime = vip.expiresAt > now ? vip.expiresAt : now;
      const newExpiresAt = new Date(
        baseTime.getTime() + days * 24 * 60 * 60 * 1000
      );

      const updated = await prisma.vip.update({
        where: { userId_guildId: { userId, guildId: GUILD_ID } },
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
        where: { userId_guildId: { userId, guildId: GUILD_ID } },
        include: { friends: true }, // Puxa a lista de amigos para retornar
      });

      if (!vip) return { success: false };

      // O delete do Prisma com 'onDelete: Cascade' no schema já deveria apagar os amigos,
      // mas vamos garantir deletando o registro VIP.
      await prisma.vip.delete({
        where: { userId_guildId: { userId, guildId: GUILD_ID } },
      });

      return {
        success: true,
        friendsToRemove: vip.friends.map((f) => f.friendId), // Retorna array de IDs
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
      const expiredVips = await prisma.vip.findMany({
        where: {
          guildId: GUILD_ID,
          expiresAt: { lt: now }, // lt = less than (menor que agora)
        },
      });

      if (expiredVips.length === 0) return;
      console.log(
        `[VIP SYSTEM] Encontrados ${expiredVips.length} VIPs expirados.`
      );

      const guild = client.guilds.cache.get(GUILD_ID);
      const vipRoleId = process.env.VIP_ROLE_ID;

      for (const vip of expiredVips) {
        // Remove do Banco
        const result = await module.exports.removeVip(vip.userId);

        // Remove do Discord
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
        where: { userId_guildId: { userId, guildId: GUILD_ID } },
        include: { friends: true },
      });

      if (!vip) return null;

      // Formata para ficar igual ao objeto que usávamos no JSON
      return {
        tier: vip.tier,
        since: vip.since.getTime(),
        expiresAt: vip.expiresAt ? vip.expiresAt.getTime() : null,
        customRoleId: vip.customRoleId,
        customChannelId: vip.customChannelId,
        friends: vip.friends.map((f) => f.friendId), // Transforma em array de IDs
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
        where: { userId_guildId: { userId, guildId: GUILD_ID } },
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
        where: { userId_guildId: { userId: vipId, guildId: GUILD_ID } },
        include: { friends: true },
      });

      if (!vip) return { success: false, msg: "Você não é VIP." };

      // Checa se já é amigo DESTE vip
      if (vip.friends.some((f) => f.friendId === friendId)) {
        return { success: false, msg: "Este usuário já está na sua lista." };
      }

      // Cria relação
      await prisma.vipFriend.create({
        data: {
          friendId,
          guildId: GUILD_ID,
          ownerId: vipId,
        },
      });

      return { success: true };
    } catch (e) {
      // Erro P2002 no Prisma significa violação de unicidade (já existe)
      if (e.code === "P2002")
        return { success: false, msg: "Erro: Usuário já adicionado." };
      console.error("[DB ERROR] addFriend:", e);
      return { success: false, msg: "Erro de banco de dados." };
    }
  },

  removeFriend: async (vipId, friendId) => {
    try {
      // Tenta deletar a relação específica
      // Como não temos um ID único fácil para a relação no delete, usamos deleteMany com filtros
      const result = await prisma.vipFriend.deleteMany({
        where: {
          ownerId: vipId,
          friendId: friendId,
          guildId: GUILD_ID,
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
