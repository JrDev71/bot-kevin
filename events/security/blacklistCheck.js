// events/security/blacklistCheck.js
const { isBlacklisted } = require("../../protectionManager");

module.exports = {
  name: "guildMemberAdd", // Dispara quando alguém entra
  async execute(client, member) {
    // Checa se o ID está na lista negra
    if (isBlacklisted(member.id)) {
      try {
        // Tenta enviar DM
        await member
          .send(
            "🚫 Você está na Blacklist deste servidor e foi banido automaticamente."
          )
          .catch(() => {});

        // Bane imediatamente
        await member.ban({ reason: "[AUTO-BAN] Usuário na Blacklist." });

        // Log no console (o log de auditoria de ban pegará o evento de banimento depois)
        console.log(
          `[BLACKLIST] ${member.user.tag} tentou entrar e foi banido.`
        );
      } catch (error) {
        console.error(`[BLACKLIST] Falha ao banir ${member.user.tag}:`, error);
      }
    }
  },
};
