// events/loggers/channelCreate.js
const { AuditLogEvent, ChannelType } = require("discord.js");
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "channelCreate",
  async execute(client, channel) {
    // Ignora canais de DM
    if (channel.type === ChannelType.DM) return;

    const logChannelId = client.config.CHANNEL_UPDATE_LOG_ID;

    let executor = null;
    try {
      const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelCreate,
      });
      const logEntry = fetchedLogs.entries.first();

      // Verifica se o log é recente e corresponde ao canal
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

    const creatorTag = executor ? `${executor.tag}` : "Desconhecido";

    const fields = [
      { name: "🛠️ Criado por", value: creatorTag, inline: true },
      { name: "📂 Tipo", value: `${channel.type}`, inline: true }, // Mostra o número do tipo, ou converta se preferir
      { name: "🆔 ID", value: channel.id, inline: false },
    ];

    await logEmbed(
      client,
      logChannelId,
      "✨ Canal Criado",
      `O canal **#${channel.name}** foi criado.`,
      0x2ecc71, // Verde
      fields
    );
  },
};
