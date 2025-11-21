// events/loggers/modTimeout.js
const { AuditLogEvent } = require("discord.js");
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "guildMemberUpdate",
  async execute(client, oldMember, newMember) {
    const channelId = client.config.MOD_MUTE_LOG_ID;

    // Verifica mudança no status de "Communication Disabled" (Timeout)
    const isTimedOut = newMember.isCommunicationDisabled();
    const wasTimedOut = oldMember.isCommunicationDisabled();

    if (isTimedOut === wasTimedOut) return; // Nenhuma mudança no Timeout

    let title = "";
    let description = "";
    let color = 0;
    let executor = null;

    // Busca nos Audit Logs quem aplicou/removeu o castigo
    try {
      const fetchedLogs = await newMember.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberUpdate,
      });
      const logEntry = fetchedLogs.entries.first();

      // Verifica se o log é recente e se o alvo é o membro atual
      if (
        logEntry &&
        logEntry.target.id === newMember.id &&
        logEntry.createdTimestamp > Date.now() - 5000
      ) {
        executor = logEntry.executor;
      }
    } catch (error) {
      console.error("Erro ao buscar Audit Logs de Timeout:", error);
    }

    const modTag = executor ? `${executor.tag}` : "Desconhecido/Automático";

    // 1. APLICOU CASTIGO
    if (!wasTimedOut && isTimedOut) {
      const duration = newMember.communicationDisabledUntil;
      const durationStr = `<t:${Math.floor(duration.getTime() / 1000)}:R>`; // Ex: "termina em 5 minutos"

      title = "🤐 Membro Castigado (Timeout)";
      description = `**${newMember.user.tag}** foi silenciado.`;
      color = 0xe74c3c; // Vermelho

      await logEmbed(
        client,
        channelId,
        title,
        description,
        color,
        [
          { name: "👮 Aplicado por", value: modTag, inline: true },
          { name: "⏰ Duração", value: durationStr, inline: true },
        ],
        newMember.user.displayAvatarURL()
      );
    }

    // 2. REMOVEU CASTIGO
    else if (wasTimedOut && !isTimedOut) {
      title = "🗣️ Castigo Removido";
      description = `**${newMember.user.tag}** voltou a poder falar.`;
      color = 0x2ecc71; // Verde

      await logEmbed(
        client,
        channelId,
        title,
        description,
        color,
        [{ name: "👮 Removido por", value: modTag, inline: true }],
        newMember.user.displayAvatarURL()
      );
    }
  },
};
