// economyManager.js
const prisma = require("./database");

// Configurações
const DAILY_AMOUNT = 500;
const WORK_MIN = 50;
const WORK_MAX = 200;
const COOLDOWN_DAILY = 24 * 60 * 60 * 1000;
const COOLDOWN_WORK = 1 * 60 * 60 * 1000;

module.exports = {
  // --- CONTA & SALDO ---
  getAccount: async (userId, guildId) => {
    let account = await prisma.economy.findUnique({
      where: { userId_guildId: { userId, guildId } },
    });
    if (!account) {
      account = await prisma.economy.create({ data: { userId, guildId } });
    }
    return account;
  },

  addMoney: async (userId, guildId, amount) => {
    const acc = await module.exports.getAccount(userId, guildId);
    await prisma.economy.update({
      where: { id: acc.id },
      data: { wallet: acc.wallet + amount },
    });
    return acc.wallet + amount;
  },

  removeMoney: async (userId, guildId, amount) => {
    const acc = await module.exports.getAccount(userId, guildId);
    const newBalance = Math.max(0, acc.wallet - amount);
    await prisma.economy.update({
      where: { id: acc.id },
      data: { wallet: newBalance },
    });
    return newBalance;
  },

  pay: async (senderId, receiverId, guildId, amount) => {
    const sender = await module.exports.getAccount(senderId, guildId);
    const receiver = await module.exports.getAccount(receiverId, guildId);

    if (sender.wallet < amount)
      return { success: false, msg: "Saldo insuficiente." };
    if (amount <= 0) return { success: false, msg: "Valor inválido." };

    await prisma.$transaction([
      prisma.economy.update({
        where: { id: sender.id },
        data: { wallet: sender.wallet - amount },
      }),
      prisma.economy.update({
        where: { id: receiver.id },
        data: { wallet: receiver.wallet + amount },
      }),
    ]);

    return { success: true };
  },

  // --- ECONOMIA BÁSICA ---
  claimDaily: async (userId, guildId) => {
    const acc = await module.exports.getAccount(userId, guildId);
    const now = Date.now();
    const last = acc.lastDaily ? acc.lastDaily.getTime() : 0;

    if (now - last < COOLDOWN_DAILY) {
      const remaining = COOLDOWN_DAILY - (now - last);
      return { success: false, remaining };
    }

    await prisma.economy.update({
      where: { id: acc.id },
      data: { wallet: acc.wallet + DAILY_AMOUNT, lastDaily: new Date() },
    });

    return { success: true, amount: DAILY_AMOUNT };
  },

  work: async (userId, guildId) => {
    const acc = await module.exports.getAccount(userId, guildId);
    const now = Date.now();
    const last = acc.lastWork ? acc.lastWork.getTime() : 0;

    if (now - last < COOLDOWN_WORK) {
      const remaining = COOLDOWN_WORK - (now - last);
      return { success: false, remaining };
    }

    const earnings =
      Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN;

    await prisma.economy.update({
      where: { id: acc.id },
      data: { wallet: acc.wallet + earnings, lastWork: new Date() },
    });

    return { success: true, amount: earnings };
  },

  getLeaderboard: async (guildId) => {
    return await prisma.economy.findMany({
      where: { guildId },
      orderBy: { wallet: "desc" },
      take: 10,
    });
  },

  // --- SISTEMA DE ITENS (CRIME) ---

  // Função que estava faltando ou mal exportada
  buyItem: async (userId, guildId, itemPrice, itemId) => {
    const acc = await module.exports.getAccount(userId, guildId);

    if (acc.wallet < itemPrice)
      return { success: false, msg: "Saldo insuficiente." };

    try {
      await prisma.$transaction([
        prisma.economy.update({
          where: { id: acc.id },
          data: { wallet: acc.wallet - itemPrice },
        }),
        prisma.inventory.upsert({
          where: { userId_guildId_itemId: { userId, guildId, itemId } },
          update: { quantity: { increment: 1 } },
          create: { userId, guildId, itemId, quantity: 1 },
        }),
      ]);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, msg: "Erro no banco de dados." };
    }
  },

  hasItem: async (userId, guildId, itemId) => {
    const item = await prisma.inventory.findUnique({
      where: { userId_guildId_itemId: { userId, guildId, itemId } },
    });
    return item && item.quantity > 0;
  },

  getItems: async (userId, guildId) => {
    return await prisma.inventory.findMany({ where: { userId, guildId } });
  },
};
