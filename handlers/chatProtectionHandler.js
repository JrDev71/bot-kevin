// handlers/chatProtectionHandler.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// WHITELIST (Seu ID e Subs)
const WHITELIST_IDS = ["SEU_ID_AQUI", "OUTRO_ID"];

module.exports = async (message) => {
  if (message.author.bot) return false;
  if (message.guild.ownerId === message.author.id) return false;
  if (WHITELIST_IDS.includes(message.author.id)) return false;
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return false;

  const content = message.content.toLowerCase(); // Texto em minúsculo para verificação
  const { member, channel } = message;
  let violationType = null;
  let reason = "";

  // --- 1. ANTI-EVERYONE / HERE (Texto Puro) ---
  // Verifica se o texto contem a string exata, mesmo sem permissão de ping
  if (content.includes("@everyone") || content.includes("@here")) {
    violationType = "MASS_MENTION";
    reason =
      "🐮 **Não marca seu boi!** É proibido digitar `@everyone` ou `@here`.";
  }

  // --- 2. ANTI-INVITE (Regex Agressiva) ---
  // Pega discord.gg, discord.com/invite, etc.
  const inviteRegex = /(discord\.(gg|io|me|li)|discord(app)?\.com\/invite)/i;

  if (!violationType && inviteRegex.test(content)) {
    violationType = "INVITE_LINK";
    reason = "🚫 **É proibido enviar convites de outros servidores!**";
  }

  // --- AÇÃO PUNITIVA ---
  if (violationType) {
    try {
      if (message.deletable) await message.delete().catch(() => {});

      const embed = new EmbedBuilder()
        .setDescription(`${message.author}, ${reason}`)
        .setColor(0xff0000);

      const msg = await channel.send({ embeds: [embed] });
      setTimeout(() => msg.delete().catch(() => {}), 5000);

      return true;
    } catch (error) {
      console.error(`Erro ChatProtection: ${error.message}`);
    }
  }

  return false;
};
