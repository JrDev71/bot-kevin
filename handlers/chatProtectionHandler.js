// handlers/chatProtectionHandler.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// --- CONFIGURAÇÃO DA WHITELIST (Imunidade Total) ---
// Coloque aqui SEU ID e de quem realmente manda (Donos/Devs)
const WHITELIST_IDS = ["578307859964624928", "697947696702554223"];

module.exports = async (message) => {
  // 1. Verifica Whitelist Suprema (Apenas estes podem tudo)
  if (message.author.bot) return false;
  if (message.guild.ownerId === message.author.id) return false;
  if (WHITELIST_IDS.includes(message.author.id)) return false;

  // REMOVIDO: A checagem de Administrador foi retirada.
  // Agora Admins também tomam bronca se quebrarem as regras abaixo.

  const { content, member, channel } = message;
  const contentLower = content.toLowerCase();
  let violationType = null;
  let warningMessage = "";

  // --- 2. ANTI-EVERYONE / HERE (Para todos, inclusive Admins) ---
  // Verifica a menção real ou o texto escrito na raça
  if (
    message.mentions.everyone ||
    contentLower.includes("@everyone") ||
    contentLower.includes("@here")
  ) {
    violationType = "MASS_MENTION";
    warningMessage = `🐂 **${message.author}, não marca seu boi!** Menções globais foram restritas pelos bigode do serv`;
  }

  // --- 3. ANTI-INVITE ---
  const inviteRegex = /(discord\.(gg|io|me|li)|discord(app)?\.com\/invite)/i;

  if (!violationType && inviteRegex.test(contentLower)) {
    // Opcional: Se quiser deixar Admins mandarem link, descomente o if abaixo envolvendo o bloco
    // if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    violationType = "INVITE_LINK";
    warningMessage = `🚫 **${message.author}, Tá fazendo div? Está com nós ou tá com os cara?**`;
    // }
  }

  // --- AÇÃO PUNITIVA ---
  if (violationType) {
    try {
      // 1. Deleta a mensagem
      if (message.deletable) {
        await message.delete().catch(() => {});
      }

      // 2. Envia a Bronca
      const embed = new EmbedBuilder()
        .setDescription(warningMessage)
        .setColor(0xff0000); // Vermelho

      const msg = await channel.send({ embeds: [embed] });

      // Apaga a bronca depois de 5 segundos
      setTimeout(() => msg.delete().catch(() => {}), 5000);

      return true; // Interrompe o bot
    } catch (error) {
      console.error(`Erro no ChatProtection: ${error.message}`);
    }
  }

  return false; // Tudo limpo
};
