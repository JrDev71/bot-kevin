// events/loggers/channelUpdate.js
const { AuditLogEvent, ChannelType } = require("discord.js");
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "channelUpdate",
  async execute(client, oldChannel, newChannel) {
    if (newChannel.type === ChannelType.DM) return;

    // Ignora atualizações internas que não são visuais (ex: rawPosition, lastMessageId)
    if (
      oldChannel.name === newChannel.name &&
      oldChannel.topic === newChannel.topic
    ) {
      return;
    }

    const logChannelId = client.config.CHANNEL_UPDATE_LOG_ID;
    const fields = [];
    let changeType = "Atualização";

    // Detecta mudança de Nome
    if (oldChannel.name !== newChannel.name) {
      changeType = "Nome Alterado";
      fields.push(
        { name: "Nome Antigo", value: oldChannel.name, inline: true },
        { name: "Nome Novo", value: newChannel.name, inline: true }
      );
    }

    // Detecta mudança de Tópico
    if (oldChannel.topic !== newChannel.topic) {
      changeType = "Tópico Alterado";
      const oldTopic = oldChannel.topic
        ? oldChannel.topic.length > 100
          ? oldChannel.topic.substring(0, 100) + "..."
          : oldChannel.topic
        : "Nenhum";
      const newTopic = newChannel.topic
        ? newChannel.topic.length > 100
          ? newChannel.topic.substring(0, 100) + "..."
          : newChannel.topic
        : "Nenhum";

      fields.push(
        { name: "Tópico Antigo", value: oldTopic, inline: false },
        { name: "Tópico Novo", value: newTopic, inline: false }
      );
    }

    // Busca quem editou
    let executor = null;
    try {
      const fetchedLogs = await newChannel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelUpdate,
      });
      const logEntry = fetchedLogs.entries.first();
      if (
        logEntry &&
        logEntry.target.id === newChannel.id &&
        logEntry.createdTimestamp > Date.now() - 5000
      ) {
        executor = logEntry.executor;
      }
    } catch (e) {
      console.error(e);
    }

    const editorTag = executor ? ` por **${executor.tag}**` : "";

    await logEmbed(
      client,
      logChannelId,
      `📝 Canal Editado: ${changeType}`,
      `O canal <#${newChannel.id}> foi atualizado${editorTag}.`,
      0xf1c40f, // Amarelo
      fields
    );
  },
};
