// events/loggers/modVoiceMute.js
const { AuditLogEvent } = require("discord.js");
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "voiceStateUpdate",
  async execute(client, oldState, newState) {
    const channelId = client.config.MOD_MUTE_LOG_ID;
    const member = newState.member;

    // Ignora bots
    if (member.user.bot) return;

    // Verifica mudanças de Mute e Deafen pelo SERVIDOR (não self-mute)
    const muteChanged = oldState.serverMute !== newState.serverMute;
    const deafChanged = oldState.serverDeaf !== newState.serverDeaf;

    if (!muteChanged && !deafChanged) return;

    let title = "";
    let description = "";
    let color = 0;
    let executor = null;

    // Busca quem fez a ação
    try {
      const fetchedLogs = await newState.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberUpdate,
      });
      const logEntry = fetchedLogs.entries.first();
      if (
        logEntry &&
        logEntry.target.id === member.id &&
        logEntry.createdTimestamp > Date.now() - 5000
      ) {
        executor = logEntry.executor;
      }
    } catch (e) {
      console.error(e);
    }

    const modTag = executor ? executor.tag : "Desconhecido";

    // 1. MUTE DE VOZ (Microfone)
    if (muteChanged) {
      if (newState.serverMute) {
        title = "🔇 Silenciado na Call (Server Mute)";
        description = `**${member.user.tag}** foi silenciado pelo servidor.`;
        color = 0xe67e22; // Laranja
      } else {
        title = "🔊 Voz Liberada (Server Unmute)";
        description = `**${member.user.tag}** teve a voz liberada.`;
        color = 0x2ecc71; // Verde
      }
    }

    // 2. DEAFEN DE VOZ (Áudio/Fone)
    if (deafChanged) {
      if (newState.serverDeaf) {
        title = "🙉 Ensurdecido na Call (Server Deafen)";
        description = `**${member.user.tag}** foi ensurdecido pelo servidor.`;
        color = 0xe67e22;
      } else {
        title = "👂 Áudio Liberado (Server Undeafen)";
        description = `**${member.user.tag}** voltou a ouvir na call.`;
        color = 0x2ecc71;
      }
    }

    await logEmbed(
      client,
      channelId,
      title,
      description,
      color,
      [
        { name: "👮 Mod", value: modTag, inline: true },
        {
          name: "📍 Canal",
          value: newState.channel
            ? `<#${newState.channel.id}>`
            : "Desconectado",
          inline: true,
        },
      ],
      member.user.displayAvatarURL()
    );
  },
};
