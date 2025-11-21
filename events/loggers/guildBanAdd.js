// events/loggers/guildBanAdd.js
const { AuditLogEvent } = require("discord.js");
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "guildBanAdd",
  async execute(client, ban) {
    const channelId = client.config.MOD_BAN_LOG_ID;

    // Tenta buscar quem baniu nos Audit Logs
    let executor = null;
    try {
      const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd,
      });
      const banLog = fetchedLogs.entries.first();

      // Verifica se o log encontrado corresponde ao usuário banido recentemente
      if (
        banLog &&
        banLog.target.id === ban.user.id &&
        banLog.createdTimestamp > Date.now() - 5000
      ) {
        executor = banLog.executor;
      }
    } catch (error) {
      console.error("Erro ao buscar Audit Logs de Ban:", error);
    }

    const fields = [
      {
        name: "🔨 Banido por",
        value: executor
          ? `${executor.tag}`
          : "Desconhecido (Log não encontrado)",
        inline: true,
      },
      { name: "🆔 ID do Usuário", value: ban.user.id, inline: true },
    ];

    await logEmbed(
      client,
      channelId,
      "🚫 Membro Banido",
      `**${ban.user.tag}** foi banido do servidor.`,
      0x992d22, // Vermelho Escuro
      fields,
      ban.user.displayAvatarURL()
    );
  },
};
