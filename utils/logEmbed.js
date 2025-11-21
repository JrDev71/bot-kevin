// utils/logEmbed.js
const { EmbedBuilder } = require("discord.js");

/**
 * Função utilitária para criar e enviar logs padronizados para canais específicos.
 * * @param {object} client - O cliente do Discord.
 * @param {string} channelId - O ID do canal onde o log deve ser enviado (definido no .env/config).
 * @param {string} title - O título do Embed (ex: "Membro Entrou").
 * @param {string} description - A descrição detalhada do evento.
 * @param {string|number} color - A cor da lateral do Embed (ex: 0x00FF00 para verde).
 * @param {Array} fields - (Opcional) Array de objetos de campos {name, value, inline}.
 * @param {string} thumbnail - (Opcional) URL da imagem para a miniatura (avatar, etc).
 */
module.exports = async (
  client,
  channelId,
  title,
  description,
  color,
  fields = [],
  thumbnail = null
) => {
  // 1. Validação Básica
  if (!channelId) {
    // Se o ID não estiver no .env, ignoramos silenciosamente (ou logamos no console)
    // Isso evita erros se você não quiser configurar TODOS os tipos de log agora.
    return;
  }

  // 2. Busca o Canal
  const logChannel = client.channels.cache.get(channelId);

  if (!logChannel) {
    console.warn(
      `[LOG SYSTEM] Canal de Log com ID "${channelId}" não encontrado ou o bot não tem acesso.`
    );
    return;
  }

  // 3. Constrói o Embed
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp()
    .setFooter({
      text: `ID do Bot: ${client.user.id}`,
      iconURL: client.user.displayAvatarURL(),
    });

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  // 4. Envia o Log
  try {
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error(
      `[LOG SYSTEM] Erro ao enviar log para o canal ${logChannel.name}:`,
      error
    );
  }
};
