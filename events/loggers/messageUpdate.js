// events/loggers/messageUpdate.js
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "messageUpdate",
  async execute(client, oldMessage, newMessage) {
    // Ignora bots
    if (newMessage.author?.bot) return;

    // Ignora se o conteúdo for idêntico (ex: o Discord apenas carregou um embed de link)
    if (oldMessage.content === newMessage.content) return;

    const channelId = client.config.MESSAGE_EDIT_LOG_ID;

    // Previne erros se o conteúdo for muito longo para um Embed (limite de 1024 caracteres)
    const oldContent = oldMessage.content
      ? oldMessage.content.length > 1000
        ? oldMessage.content.slice(0, 997) + "..."
        : oldMessage.content
      : "*[Conteúdo não disponível]*";

    const newContent = newMessage.content
      ? newMessage.content.length > 1000
        ? newMessage.content.slice(0, 997) + "..."
        : newMessage.content
      : "*[Conteúdo não disponível]*";

    const fields = [
      { name: "📍 Canal", value: `<#${newMessage.channel.id}>`, inline: true },
      {
        name: "📜 Mensagem [Link]",
        value: `[Ir para mensagem](${newMessage.url})`,
        inline: true,
      },
      { name: "❌ Antes", value: oldContent, inline: false },
      { name: "✅ Depois", value: newContent, inline: false },
    ];

    await logEmbed(
      client,
      channelId,
      "✏️ Mensagem Editada",
      `**${newMessage.author.tag}** editou uma mensagem.`,
      0x3498db, // Azul
      fields,
      newMessage.author.displayAvatarURL()
    );
  },
};
