// events/loggers/guildMemberUpdate.js
const logEmbed = require("../../utils/logEmbed");

module.exports = {
  // Nome do evento do Discord que este arquivo escuta
  name: "guildMemberUpdate",
  once: false,

  // O 'client' é passado como primeiro argumento pelo nosso index.js
  async execute(client, oldMember, newMember) {
    const logAuthor = newMember.user;
    const logFields = [];
    let logTitle = "📝 Perfil do Membro Atualizado";
    let logColor = 0x3498db; // Azul padrão

    // 1. Lógica de Mudança de Apelido (Nickname)
    if (oldMember.nickname !== newMember.nickname) {
      logTitle = "🖊️ Apelido Alterado";
      logColor = 0xf1c40f; // Amarelo
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

    // 2. Lógica de Mudança de Cargos
    const oldRoles = oldMember.roles.cache.map((r) => r.name);
    const newRoles = newMember.roles.cache.map((r) => r.name);

    const addedRoles = newRoles.filter((role) => !oldRoles.includes(role));
    const removedRoles = oldRoles.filter((role) => !newRoles.includes(role));

    if (addedRoles.length > 0) {
      logTitle = "➕ Cargo Adicionado";
      logColor = 0x2ecc71; // Verde
      logFields.push({
        name: "Cargos Adicionados",
        value: addedRoles.join("\n"),
        inline: false,
      });
    }

    if (removedRoles.length > 0) {
      logTitle = "➖ Cargo Removido";
      logColor = 0xe74c3c; // Vermelho
      logFields.push({
        name: "Cargos Removidos",
        value: removedRoles.join("\n"),
        inline: false,
      });
    }

    // Se nada de relevante mudou (ex: apenas o estado do PD mudou, que não rastreamos aqui), saímos.
    if (logFields.length === 0) {
      return;
    }

    const logDescription = `**Membro:** ${logAuthor.tag} (${logAuthor.id})`;

    logEmbed(
      client,
      logTitle,
      logDescription,
      logColor,
      logFields,
      logAuthor.displayAvatarURL()
    );
  },
};
