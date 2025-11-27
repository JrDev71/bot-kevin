// commands/modBasic.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { isPanela } = require("../protectionManager");

module.exports = {
  handleBan: async (message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.channel.send(
        "<:Nao:1443642030637977743> Você não tem permissão para banir membros."
      );

    const target = message.mentions.members.first();
    const reason = args.slice(1).join(" ") || "Nenhum motivo especificado";

    if (!target)
      return message.channel.send(
        "<:Nao:1443642030637977743> Mencione alguém para banir."
      );

    if (target.id === message.author.id)
      return message.channel.send(
        "<:Nao:1443642030637977743> Você não pode se banir."
      );

    // --- CHECAGEM DA PANELA (AGORA COM AWAIT) ---
    const protectedUser = await isPanela(target.id); // <--- AWAIT ADICIONADO

    if (protectedUser) {
      return message.channel.send(
        `<:escudo:1443654659498840135> **BLOQUEADO:** O usuário **${target.user.tag}** está na Panela (Anti-Ban).`
      );
    }
    // -------------------------------------------

    if (!target.bannable)
      return message.channel.send(
        "<:Nao:1443642030637977743> Não consigo banir este usuário (cargo superior)."
      );

    await target.ban({ reason: `Banido por ${message.author.tag}: ${reason}` });
    message.channel.send(
      `🔨 **${target.user.tag}** foi banido. Motivo: ${reason}`
    );
  },

  // ... (handleUnban e handleKick permanecem iguais, pois não checam panela geralmente)
  handleUnban: async (message, args) => {
    // ... (copie o código anterior ou mantenha o que tem)
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.channel.send("<:Nao:1443642030637977743> Sem permissão.");
    const userId = args[0];
    if (!userId)
      return message.channel.send("<:Nao:1443642030637977743> ID necessário.");
    try {
      await message.guild.members.unban(userId);
      message.channel.send(`<:certo_froid:1443643346722754692> Desbanido.`);
    } catch (e) {
      message.channel.send("<:Nao:1443642030637977743> Erro ao desbanir.");
    }
  },

  handleKick: async (message, args) => {
    // ...
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.channel.send("<:Nao:1443642030637977743> Sem permissão.");
    const target = message.mentions.members.first();
    if (!target)
      return message.channel.send(
        "<:Nao:1443642030637977743> Mencione alguém."
      );
    if (!target.kickable)
      return message.channel.send(
        "<:Nao:1443642030637977743> Não consigo expulsar."
      );
    await target.kick();
    message.channel.send(`🦶 **${target.user.tag}** foi expulso.`);
  },
};
