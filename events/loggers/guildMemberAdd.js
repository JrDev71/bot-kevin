// events/loggers/guildMemberAdd.js
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "guildMemberAdd",
  async execute(client, member) {
    const channelId = client.config.MEMBER_JOIN_LEAVE_LOG_ID;

    // Cálculo da idade da conta (Útil para segurança)
    const createdAt = new Date(member.user.createdTimestamp);
    const joinedAt = new Date();
    const accountAgeDays = Math.floor(
      (joinedAt - createdAt) / (1000 * 60 * 60 * 24)
    );

    const fields = [
      {
        name: "📅 Data de Criação da Conta",
        value: `<t:${Math.floor(
          createdAt.getTime() / 1000
        )}:f> (${accountAgeDays} dias atrás)`,
        inline: false,
      },
      { name: "🆔 ID do Usuário", value: member.id, inline: true },
    ];

    // Alerta visual se a conta for muito nova (menos de 3 dias)
    const titlePrefix = accountAgeDays < 3 ? "⚠️ " : "";
    const color = accountAgeDays < 3 ? 0xe67e22 : 0x2ecc71; // Laranja se suspeito, Verde se normal

    await logEmbed(
      client,
      channelId,
      `${titlePrefix}📥 Membro Entrou`,
      `**${member.user.tag}** entrou no servidor.`,
      color,
      fields,
      member.user.displayAvatarURL()
    );
  },
};
