// events/loggers/messageDelete.js
const logEmbed = require("../../utils/logEmbed");
const { AuditLogEvent } = require("discord.js");

module.exports = {
  name: "messageDelete",
  async execute(client, message) {
    // Ignora mensagens de bots ou mensagens parciais sem conteúdo (não cacheadas)
    if (message.author?.bot) return;

    const channelId = client.config.MESSAGE_DELETE_LOG_ID;

    // Tenta pegar o conteúdo, ou avisa que não estava em cache
    const content = message.content
      ? message.content.length > 1024
        ? message.content.slice(0, 1021) + "..."
        : message.content
      : "*[Conteúdo não disponível / Imagem ou Embed]*";

    const fields = [
      { name: "📍 Canal", value: `<#${message.channel.id}>`, inline: true },
      { name: "🗑️ Conteúdo Apagado", value: content, inline: false },
    ];

    // Tenta identificar quem apagou (Audit Logs) - Nota: Isso nem sempre é preciso/rápido
    // Para simplificar e evitar rate limits, vamos focar no autor da mensagem apagada.

    const description = `Uma mensagem de **${
      message.author ? message.author.tag : "Usuário Desconhecido"
    }** foi apagada.`;

    await logEmbed(
      client,
      channelId,
      "🗑️ Mensagem Apagada",
      description,
      0xe74c3c, // Vermelho
      fields,
      message.author ? message.author.displayAvatarURL() : null
    );
  },
};
