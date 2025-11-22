// commands/modBasic.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { isPanela } = require("../protectionManager"); // <--- IMPORTAÇÃO CRUCIAL

module.exports = {
  handleBan: async (message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.channel.send("❌ Sem permissão.");

    const target = message.mentions.members.first();
    const reason = args.slice(1).join(" ") || "Sem motivo";

    if (!target) return message.channel.send("❌ Mencione alguém.");

    // --- CHECAGEM DA PANELA (ANTI-BAN) ---
    // Se retornar true, para o comando imediatamente
    if (isPanela(target.id)) {
      return message.channel.send(
        `🛡️ **BLOQUEADO:** O usuário **${target.user.tag}** está na Panela (Anti-Ban).`
      );
    }
    // ------------------------------------

    if (!target.bannable)
      return message.channel.send(
        "❌ Não consigo banir este usuário (cargo superior)."
      );

    await target.ban({ reason: `Banido por ${message.author.tag}: ${reason}` });
    message.channel.send(`🔨 **${target.user.tag}** foi banido.`);
  },

  handleUnban: async (message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return;
    const userId = args[0];
    if (!userId) return message.channel.send("❌ ID necessário.");

    try {
      await message.guild.members.unban(userId);
      message.channel.send(`✅ Desbanido.`);
    } catch (e) {
      message.channel.send("❌ Erro ao desbanir.");
    }
  },

  handleKick: async (message, args) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return;
    const target = message.mentions.members.first();
    if (!target) return message.channel.send("❌ Mencione alguém.");
    if (!target.kickable)
      return message.channel.send("❌ Não consigo expulsar.");

    await target.kick();
    message.channel.send(`🦶 **${target.user.tag}** foi expulso.`);
  },
};
