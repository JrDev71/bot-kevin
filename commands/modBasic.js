// commands/modBasic.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  handleBan: async (message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.channel.send(
        "❌ Você não tem permissão para banir membros."
      );

    const target = message.mentions.members.first();
    const reason = args.slice(1).join(" ") || "Nenhum motivo especificado";

    if (!target) return message.channel.send("❌ Mencione alguém para banir.");

    // Proteção extra: não banir a si mesmo ou o dono
    if (target.id === message.author.id)
      return message.channel.send("❌ Você não pode se banir.");
    if (!target.bannable)
      return message.channel.send(
        "❌ Não consigo banir este usuário (ele pode ter um cargo maior que o meu)."
      );

    await target.ban({ reason: `Banido por ${message.author.tag}: ${reason}` });
    message.channel.send(
      `🔨 **${target.user.tag}** foi banido. Motivo: ${reason}`
    );
  },

  handleUnban: async (message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.channel.send("❌ Sem permissão.");

    const userId = args[0];
    if (!userId)
      return message.channel.send("❌ Forneça o ID do usuário para desbanir.");

    try {
      await message.guild.members.unban(userId);
      message.channel.send(`✅ Usuário ${userId} desbanido com sucesso.`);
    } catch (e) {
      message.channel.send("❌ Usuário não encontrado ou não está banido.");
    }
  },

  handleKick: async (message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.channel.send("❌ Sem permissão.");

    const target = message.mentions.members.first();
    const reason = args.slice(1).join(" ") || "Sem motivo";

    if (!target)
      return message.channel.send("❌ Mencione alguém para expulsar.");
    if (!target.kickable)
      return message.channel.send("❌ Não consigo expulsar este usuário.");

    await target.kick(reason);
    message.channel.send(
      `🦶 **${target.user.tag}** foi expulso. Motivo: ${reason}`
    );
  },
};
