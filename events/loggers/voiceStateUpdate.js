// events/loggers/voiceStateUpdate.js
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "voiceStateUpdate",
  async execute(client, oldState, newState) {
    const channelId = client.config.VOICE_LOG_ID;
    const member = newState.member;

    // Ignora bots se desejar (opcional, mas recomendado para evitar spam de bots de música)
    if (member.user.bot) return;

    let title = "";
    let description = "";
    let color = 0;
    const fields = [];

    // 1. ENTROU EM CALL
    if (!oldState.channelId && newState.channelId) {
      title = "🔊 Entrou em Call";
      description = `**${member.user.tag}** conectou-se a um canal de voz.`;
      color = 0x2ecc71; // Verde
      fields.push({
        name: "Canal",
        value: `<#${newState.channelId}>`,
        inline: true,
      });
    }
    // 2. SAIU DA CALL
    else if (oldState.channelId && !newState.channelId) {
      title = "🔇 Saiu da Call";
      description = `**${member.user.tag}** desconectou-se de um canal de voz.`;
      color = 0xe74c3c; // Vermelho
      fields.push({
        name: "Canal Anterior",
        value: `<#${oldState.channelId}>`,
        inline: true,
      });
    }
    // 3. MOVEU DE CALL
    else if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      title = "🔄 Trocou de Call";
      description = `**${member.user.tag}** mudou de canal de voz.`;
      color = 0x3498db; // Azul
      fields.push(
        { name: "De", value: `<#${oldState.channelId}>`, inline: true },
        { name: "Para", value: `<#${newState.channelId}>`, inline: true }
      );
    }
    // Caso seja apenas mute/unmute ou câmera (não é tráfego), ignoramos aqui.
    else {
      return;
    }

    // Adiciona ID do usuário sempre
    fields.push({ name: "🆔 ID do Usuário", value: member.id, inline: true });

    await logEmbed(
      client,
      channelId,
      title,
      description,
      color,
      fields,
      member.user.displayAvatarURL()
    );
  },
};
