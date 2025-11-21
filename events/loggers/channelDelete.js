// events/loggers/channelDelete.js
const { AuditLogEvent, ChannelType } = require("discord.js");
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "channelDelete",
  async execute(client, channel) {
    if (channel.type === ChannelType.DM) return;

    const logChannelId = client.config.CHANNEL_UPDATE_LOG_ID;

    let executor = null;
    try {
      const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete,
      });
      const logEntry = fetchedLogs.entries.first();

      // Verifica se o alvo do log é o canal deletado (target.id)
      if (
        logEntry &&
        logEntry.target.id === channel.id &&
        logEntry.createdTimestamp > Date.now() - 5000
      ) {
        executor = logEntry.executor;
      }
    } catch (e) {
      console.error(e);
    }

    const deleterTag = executor ? `${executor.tag}` : "Desconhecido";

    await logEmbed(
      client,
      logChannelId,
      "🗑️ Canal Excluído",
      `O canal **#${channel.name}** foi deletado por **${deleterTag}**.`,
      0xe74c3c, // Vermelho
      [
        { name: "Nome Anterior", value: channel.name, inline: true },
        { name: "ID", value: channel.id, inline: true },
      ]
    );
  },
};
