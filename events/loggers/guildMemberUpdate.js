// events/loggers/guildMemberUpdate.js
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  name: "guildMemberUpdate",
  async execute(client, oldMember, newMember) {
    // Pega o canal de log geral (ou crie um específico se preferir)
    const channelId = client.config.LOG_CHANNEL_ID;

    const logAuthor = newMember.user;
    const logFields = [];
    let logTitle = "📝 Perfil do Membro Atualizado";
    let logColor = 0x3498db;

    // 1. Apelido
    if (oldMember.nickname !== newMember.nickname) {
      logTitle = "🖊️ Apelido Alterado";
      logColor = 0xf1c40f;
      logFields.push(
        {
          name: "Apelido Antigo",
          value: `\`${oldMember.nickname || oldMember.user.username}\``,
          inline: true,
        },
        {
          name: "Apelido Novo",
          value: `\`${newMember.nickname || newMember.user.username}\``,
          inline: true,
        }
      );
    }

    // 2. Cargos
    const oldRoles = oldMember.roles.cache.map((r) => r.name);
    const newRoles = newMember.roles.cache.map((r) => r.name);

    const addedRoles = newRoles.filter((role) => !oldRoles.includes(role));
    const removedRoles = oldRoles.filter((role) => !newRoles.includes(role));

    if (addedRoles.length > 0) {
      logTitle = "➕ Cargo Adicionado";
      logColor = 0x2ecc71;
      logFields.push({
        name: "Cargos Adicionados",
        value: addedRoles.join("\n"),
        inline: false,
      });
    }

    if (removedRoles.length > 0) {
      logTitle = "➖ Cargo Removido";
      logColor = 0xe74c3c;
      logFields.push({
        name: "Cargos Removidos",
        value: removedRoles.join("\n"),
        inline: false,
      });
    }

    if (logFields.length === 0) return;

    const logDescription = `**Membro:** ${logAuthor.tag} (${logAuthor.id})`;

    // CORREÇÃO AQUI: Passando channelId como segundo argumento
    await logEmbed(
      client,
      channelId, // <--- O ID VEM AQUI AGORA
      logTitle,
      logDescription,
      logColor,
      logFields,
      logAuthor.displayAvatarURL()
    );
  },
};
