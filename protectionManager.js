// protectionManager.js
const prisma = require("./database");

module.exports = {
  // --- PANELA (Anti-ban) ---

  addToPanela: async (userId) => {
    try {
      // Tenta criar. Se já existir, o Prisma lança erro P2002
      await prisma.panela.create({ data: { userId } });
      return true;
    } catch (e) {
      // Código P2002 = Unique constraint failed (Já existe)
      if (e.code !== "P2002") console.error("Erro DB Panela Add:", e);
      return false;
    }
  },

  removeFromPanela: async (userId) => {
    try {
      await prisma.panela.delete({ where: { userId } });
      return true;
    } catch (e) {
      // Código P2025 = Record to delete does not exist
      if (e.code !== "P2025") console.error("Erro DB Panela Rem:", e);
      return false;
    }
  },

  isPanela: async (userId) => {
    try {
      const user = await prisma.panela.findUnique({ where: { userId } });
      return !!user; // Retorna true se achou, false se null
    } catch (e) {
      console.error("Erro DB isPanela:", e);
      return false; // Na dúvida, não protege (ou protege, dependendo da sua política)
    }
  },

  // --- BLACKLIST ---

  addToBlacklist: async (userId) => {
    try {
      await prisma.blacklist.create({ data: { userId } });
      return true;
    } catch (e) {
      if (e.code !== "P2002") console.error("Erro DB Blacklist Add:", e);
      return false;
    }
  },

  removeFromBlacklist: async (userId) => {
    try {
      await prisma.blacklist.delete({ where: { userId } });
      return true;
    } catch (e) {
      if (e.code !== "P2025") console.error("Erro DB Blacklist Rem:", e);
      return false;
    }
  },

  isBlacklisted: async (userId) => {
    try {
      const user = await prisma.blacklist.findUnique({ where: { userId } });
      return !!user;
    } catch (e) {
      console.error("Erro DB isBlacklisted:", e);
      return false;
    }
  },

  // --- LISTAR (Retorna array de IDs) ---
  getList: async (type) => {
    try {
      if (type === "panela") {
        const list = await prisma.panela.findMany();
        return list.map((item) => item.userId);
      }
      if (type === "blacklist") {
        const list = await prisma.blacklist.findMany();
        return list.map((item) => item.userId);
      }
      return [];
    } catch (e) {
      console.error("Erro DB getList:", e);
      return [];
    }
  },
};
