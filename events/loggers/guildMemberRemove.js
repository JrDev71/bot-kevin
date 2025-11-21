// events/loggers/guildMemberRemove.js
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "guildMemberRemove",
  async execute(client, member) {
    const channelId = client.config.MEMBER_JOIN_LEAVE_LOG_ID;

    // Lista os cargos que a pessoa tinha ao sair (exceto @everyone)
    const roles =
      member.roles.cache
        .filter((r) => r.name !== "@everyone")
        .map((r) => `\`${r.name}\``)
        .join(", ") || "Nenhum cargo";

    const fields = [
      {
        name: "📜 Cargos Anteriores",
        value: roles.length > 1024 ? "Muitos cargos (lista cortada)" : roles,
        inline: false,
      },
      { name: "🆔 ID do Usuário", value: member.id, inline: true },
    ];

    await logEmbed(
      client,
      channelId,
      "📤 Membro Saiu",
      `**${member.user.tag}** saiu do servidor.`,
      0xe74c3c, // Vermelho
      fields,
      member.user.displayAvatarURL()
    );
  },
};
