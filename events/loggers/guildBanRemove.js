// events/loggers/guildBanRemove.js
const { AuditLogEvent } = require("discord.js");
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "guildBanRemove",
  async execute(client, ban) {
    const channelId = client.config.MOD_BAN_LOG_ID;

    let executor = null;
    try {
      const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanRemove,
      });
      const unbanLog = fetchedLogs.entries.first();

      if (
        unbanLog &&
        unbanLog.target.id === ban.user.id &&
        unbanLog.createdTimestamp > Date.now() - 5000
      ) {
        executor = unbanLog.executor;
      }
    } catch (error) {
      console.error("Erro ao buscar Audit Logs de Desban:", error);
    }

    const fields = [
      {
        name: "🔓 Desbanido por",
        value: executor ? `${executor.tag}` : "Desconhecido",
        inline: true,
      },
      { name: "🆔 ID do Usuário", value: ban.user.id, inline: true },
    ];

    await logEmbed(
      client,
      channelId,
      "✅ Membro Desbanido",
      `O banimento de **${ban.user.tag}** foi revogado.`,
      0x2ecc71, // Verde
      fields,
      ban.user.displayAvatarURL()
    );
  },
};
