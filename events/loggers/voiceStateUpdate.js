// events/loggers/voiceStateUpdate.js
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "voiceStateUpdate",
  async execute(client, oldState, newState) {
    const member = newState.member;

    // [DEBUG 1] O evento disparou?
    console.log(
      `[DEBUG VOZ] Evento disparado para: ${
        member?.user?.tag || "Desconhecido"
      }`
    );

    if (!member || member.user.bot) {
      console.log(`[DEBUG VOZ] Ignorado (Bot ou Membro inválido).`);
      return;
    }

    // [DEBUG 2] Verificar IDs dos canais de voz
    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    console.log(`[DEBUG VOZ] Old: ${oldChannelId} -> New: ${newChannelId}`);

    // Lógica de detecção
    const joined = !oldChannelId && newChannelId;
    const left = oldChannelId && !newChannelId;
    const moved = oldChannelId && newChannelId && oldChannelId !== newChannelId;

    if (!joined && !left && !moved) {
      console.log(
        `[DEBUG VOZ] Nenhuma mudança de tráfego detectada (apenas mute/unmute/streaming).`
      );
      return;
    }

    // [DEBUG 3] Verificar configuração do Canal de Log
    const logChannelId = client.config.VOICE_LOG_ID;
    console.log(`[DEBUG VOZ] ID do Canal de Log no Config: "${logChannelId}"`);

    if (!logChannelId) {
      console.error(
        `[ERRO VOZ] A variável VOICE_LOG_ID não está definida ou está vazia no .env!`
      );
      return;
    }

    // [DEBUG 4] Verificar se o bot vê o canal
    const channelExists = client.channels.cache.get(logChannelId);
    if (!channelExists) {
      console.error(
        `[ERRO VOZ] O bot não consegue encontrar o canal de ID ${logChannelId}. Verifique se o ID está correto e se o bot tem permissão de "Ver Canal".`
      );
      return;
    }

    let title = "";
    let description = "";
    let color = 0;
    const fields = [];

    if (joined) {
      title = "🔊 Entrou em Call";
      description = `**${member.user.tag}** conectou-se a um canal de voz.`;
      color = 0x2ecc71;
      fields.push({ name: "Canal", value: `<#${newChannelId}>`, inline: true });
    } else if (left) {
      title = "🔇 Saiu da Call";
      description = `**${member.user.tag}** desconectou-se de um canal de voz.`;
      color = 0xe74c3c;
      fields.push({
        name: "Canal Anterior",
        value: `<#${oldChannelId}>`,
        inline: true,
      });
    } else if (moved) {
      title = "🔄 Trocou de Call";
      description = `**${member.user.tag}** mudou de canal de voz.`;
      color = 0x3498db;
      fields.push(
        { name: "De", value: `<#${oldChannelId}>`, inline: true },
        { name: "Para", value: `<#${newChannelId}>`, inline: true }
      );
    }

    fields.push({ name: "🆔 ID do Usuário", value: member.id, inline: true });

    console.log(`[DEBUG VOZ] Tentando enviar embed...`);

    try {
      await logEmbed(
        client,
        logChannelId,
        title,
        description,
        color,
        fields,
        member.user.displayAvatarURL()
      );
      console.log(`[DEBUG VOZ] Embed enviado com sucesso!`);
    } catch (e) {
      console.error(`[ERRO VOZ] Falha ao chamar logEmbed:`, e);
    }
  },
};
