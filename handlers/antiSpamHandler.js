// handlers/antiSpamHandler.js
const { PermissionsBitField } = require("discord.js");

// Configuração
const spamMap = new Map();
const SPAM_LIMIT = 5; // Max mensagens
const SPAM_TIME = 5000; // Em 5 segundos (5000ms)

/**
 * Verifica se a mensagem é spam.
 * @param {object} message - Objeto da mensagem.
 * @returns {boolean} - Retorna true se for spam (para parar o fluxo), false se ok.
 */
module.exports = async (message) => {
  // 1. Ignora Admins (Eles não tomam timeout)
  if (
    message.member?.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return false;
  }

  const userId = message.author.id;

  if (spamMap.has(userId)) {
    const data = spamMap.get(userId);
    const lastMsg = data.lastMessage;
    const diff = message.createdTimestamp - lastMsg.createdTimestamp;

    if (diff > SPAM_TIME) {
      // Tempo passou, reseta a contagem
      spamMap.set(userId, { count: 1, lastMessage: message });
      return false;
    }

    // Dentro do tempo limite, incrementa
    data.count++;
    data.lastMessage = message;

    if (data.count >= SPAM_LIMIT) {
      // --- AÇÃO DE PUNIÇÃO ---
      const member = message.member;
      if (member && member.moderatable) {
        try {
          // Timeout de 10 minutos
          await member.timeout(
            10 * 60 * 1000,
            "Anti-Spam: Enviou muitas mensagens rápido demais."
          );

          await message.channel.send(
            `🤐 **${message.author.tag}** entrou em timeout por SPAM.`
          );

          // Opcional: Limpar as mensagens de spam
          // await message.channel.bulkDelete(SPAM_LIMIT).catch(() => {});
        } catch (e) {
          console.error("Erro ao aplicar timeout de spam:", e);
        }
      }

      spamMap.delete(userId); // Reseta o usuário para não tentar punir novamente no próximo ms
      return true; // É spam, pare o processamento!
    }
  } else {
    // Primeira mensagem
    spamMap.set(userId, { count: 1, lastMessage: message });
  }

  return false; // Não é spam
};
