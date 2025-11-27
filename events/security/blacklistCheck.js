// events/security/blacklistCheck.js
const { isBlacklisted } = require("../../protectionManager");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberAdd", // Dispara quando alguém entra no servidor
  async execute(client, member) {
    try {
      // Verifica no Banco de Dados se o ID está na lista negra (Agora com AWAIT)
      const blacklisted = await isBlacklisted(member.id);

      if (blacklisted) {
        console.log(
          `[BLACKLIST] Alerta: O paneleiro safado ${member.user.tag} (${member.id}) tentou entrar.`
        );

        // 1. Tenta avisar o usuário na DM antes de banir
        await member
          .send({
            embeds: [
              new EmbedBuilder()
                .setTitle("🚫 Acesso Negado")
                .setDescription(
                  `Você está na **Lista Negra (Blacklist)** deste servidor e foi banido automaticamente. Sai fora paneleiro!`
                )
                .setColor(0xff0000),
            ],
          })
          .catch(() => {}); // Ignora erro se a DM estiver fechada

        // 2. Bane o usuário imediatamente
        if (member.bannable) {
          await member.ban({
            reason: "[AUTO-BAN] Usuário listado na Blacklist de Segurança.",
          });
        } else {
          console.error(
            `[BLACKLIST] Falha: Não consegui banir ${member.user.tag} (Cargo superior ou erro de permissão).`
          );
        }

        // Nota: O log de auditoria será gerado automaticamente pelo evento guildBanAdd que já configuramos!
      }
    } catch (error) {
      console.error(
        `[BLACKLIST] Erro ao verificar usuário ${member.user.tag}:`,
        error
      );
    }
  },
};
