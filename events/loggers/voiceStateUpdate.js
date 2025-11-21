// events/loggers/voiceStateUpdate.js
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "voiceStateUpdate",
  async execute(client, oldState, newState) {
    // Certifique-se que VOICE_LOG_ID está no seu .env e no index.js
    const channelId = client.config.VOICE_LOG_ID;
    const member = newState.member;

    if (member.user.bot) return;

    // Ignora mute/deafen (já tratado em outro arquivo modVoiceMute.js)
    // Focamos apenas em ENTRAR, SAIR, MOVER
    const joined = !oldState.channelId && newState.channelId;
    const left = oldState.channelId && !newState.channelId;
    const moved =
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId;

    if (!joined && !left && !moved) return;

    let title = "";
    let description = "";
    let color = 0;
    const fields = [];

    if (joined) {
      title = "🔊 Entrou em Call";
      description = `**${member.user.tag}** conectou-se a um canal de voz.`;
      color = 0x2ecc71; // Verde
      fields.push({
        name: "Canal",
        value: `<#${newState.channelId}>`,
        inline: true,
      });
    } else if (left) {
      title = "🔇 Saiu da Call";
      description = `**${member.user.tag}** desconectou-se de um canal de voz.`;
      color = 0xe74c3c; // Vermelho
      fields.push({
        name: "Canal Anterior",
        value: `<#${oldState.channelId}>`,
        inline: true,
      });
    } else if (moved) {
      title = "🔄 Trocou de Call";
      description = `**${member.user.tag}** mudou de canal de voz.`;
      color = 0x3498db; // Azul
      fields.push(
        { name: "De", value: `<#${oldState.channelId}>`, inline: true },
        { name: "Para", value: `<#${newState.channelId}>`, inline: true }
      );
    }

    fields.push({ name: "🆔 ID do Usuário", value: member.id, inline: true });

    // CORREÇÃO AQUI: Passando channelId como segundo argumento
    await logEmbed(
      client,
      channelId, // <--- O ID VEM AQUI
      title,
      description,
      color,
      fields,
      member.user.displayAvatarURL()
    );
  },
};
