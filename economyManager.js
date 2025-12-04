// economyManager.js
const prisma = require("./database");

// Configurações
const DAILY_AMOUNT = 500;
const WORK_MIN = 50;
const WORK_MAX = 200;
const COOLDOWN_DAILY = 24 * 60 * 60 * 1000; // 24 Horas
const COOLDOWN_WORK = 1 * 60 * 60 * 1000; // 1 Hora

module.exports = {
  // Busca ou cria a conta
  getAccount: async (userId, guildId) => {
    let account = await prisma.economy.findUnique({
      where: { userId_guildId: { userId, guildId } },
    });
    if (!account) {
      account = await prisma.economy.create({ data: { userId, guildId } });
    }
    return account;
  },

  // Adiciona dinheiro (Admin ou Recompensas)
  addMoney: async (userId, guildId, amount) => {
    const acc = await module.exports.getAccount(userId, guildId);
    await prisma.economy.update({
      where: { id: acc.id },
      data: { wallet: acc.wallet + amount },
    });
    return acc.wallet + amount;
  },

  // Remove dinheiro
  removeMoney: async (userId, guildId, amount) => {
    const acc = await module.exports.getAccount(userId, guildId);
    const newBalance = Math.max(0, acc.wallet - amount); // Não deixa negativo
    await prisma.economy.update({
      where: { id: acc.id },
      data: { wallet: newBalance },
    });
    return newBalance;
  },

  // Transferência (Pay)
  pay: async (senderId, receiverId, guildId, amount) => {
    const sender = await module.exports.getAccount(senderId, guildId);
    const receiver = await module.exports.getAccount(receiverId, guildId);

    if (sender.wallet < amount)
      return { success: false, msg: "Saldo insuficiente na carteira." };
    if (amount <= 0) return { success: false, msg: "Valor inválido." };

    // Transação atômica (garante que não duplica dinheiro se der erro no meio)
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

  // Coletar Daily
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
      data: {
        wallet: acc.wallet + DAILY_AMOUNT,
        lastDaily: new Date(),
      },
    });

    return { success: true, amount: DAILY_AMOUNT };
  },

  // Trabalhar
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
      data: {
        wallet: acc.wallet + earnings,
        lastWork: new Date(),
      },
    });

    return { success: true, amount: earnings };
  },

  // Ranking (Top 10)
  getLeaderboard: async (guildId) => {
    return await prisma.economy.findMany({
      where: { guildId },
      orderBy: { wallet: "desc" }, // Ordena por dinheiro na carteira (pode somar com banco se quiser)
      take: 10,
    });
  },
};
