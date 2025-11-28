// boosterManager.js
const prisma = require("./database");
const MAX_BOOSTER_FRIENDS = 5; // Defina o limite de amigos para boosters

module.exports = {
  MAX_BOOSTER_FRIENDS,

  // --- CRIAR/OBTER DADOS ---
  // Se o usuário é booster mas não tá no banco, cria na hora
  ensureBooster: async (userId) => {
    try {
      let data = await prisma.booster.findUnique({
        where: { userId },
        include: { friends: true },
      });

      if (!data) {
        data = await prisma.booster.create({
          data: { userId },
          include: { friends: true },
        });
      }

      // Formata para o padrão do bot
      return {
        ...data,
        friends: data.friends.map((f) => f.friendId),
      };
    } catch (e) {
      console.error("[DB ERROR] ensureBooster:", e);
      return null;
    }
  },

  getBoosterData: async (userId) => {
    try {
      const data = await prisma.booster.findUnique({
        where: { userId },
        include: { friends: true },
      });
      if (!data) return null;
      return {
        ...data,
        friends: data.friends.map((f) => f.friendId),
      };
    } catch (e) {
      return null;
    }
  },

  updateBoosterData: async (userId, updates) => {
    try {
      await prisma.booster.update({
        where: { userId },
        data: updates,
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  // --- LIMPEZA (Quando parar de dar Boost) ---
  removeBooster: async (userId) => {
    try {
      const data = await prisma.booster.findUnique({ where: { userId } });
      if (!data) return { success: false };

      await prisma.booster.delete({ where: { userId } });

      return {
        success: true,
        customRoleId: data.customRoleId,
        customChannelId: data.customChannelId,
      };
    } catch (e) {
      return { success: false };
    }
  },

  // --- AMIGOS ---
  addBoosterFriend: async (ownerId, friendId) => {
    try {
      const booster = await prisma.booster.findUnique({
        where: { userId: ownerId },
        include: { friends: true },
      });
      if (!booster) return { success: false, msg: "Registro não encontrado." };

      // Verifica limite (se quiser manter ilimitado, remova este if)
      /* if (booster.friends.length >= MAX_BOOSTER_FRIENDS) {
                 return { success: false, msg: "Limite de amigos atingido." };
            } */

      // Verifica se já é amigo DESTE booster
      if (booster.friends.some((f) => f.friendId === friendId)) {
        return { success: false, msg: "Já está na lista." };
      }

      await prisma.boosterFriend.create({
        data: { friendId, ownerId },
      });
      return { success: true };
    } catch (e) {
      if (e.code === "P2002")
        return { success: false, msg: "Este usuário já é convidado." };
      return { success: false, msg: "Erro DB." };
    }
  },

  removeBoosterFriend: async (ownerId, friendId) => {
    try {
      const res = await prisma.boosterFriend.deleteMany({
        where: { ownerId, friendId },
      });
      if (res.count === 0) return { success: false, msg: "Não encontrado." };
      return { success: true };
    } catch (e) {
      return { success: false, msg: "Erro DB." };
    }
  },
};
