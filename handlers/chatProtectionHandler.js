// handlers/chatProtectionHandler.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// --- CONFIGURAÇÃO DA WHITELIST (IDs que podem tudo) ---
const WHITELIST_IDS = [
  "578307859964624928", // Coloque seu ID
  "OUTRO_ID_SE_QUISER",
];

module.exports = async (message) => {
  // 1. Verifica se deve ignorar o usuário (Whitelist / Bot / Admin)
  if (message.author.bot) return false;

  // Se for o Dono do Servidor, libera tudo
  if (message.guild.ownerId === message.author.id) return false;

  // Se estiver na lista VIP de IDs, libera tudo
  if (WHITELIST_IDS.includes(message.author.id)) return false;

  // Se tiver permissão de Administrador, libera tudo
  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return false;

  const { content, member, channel } = message;
  let violationType = null;
  let warningMessage = "";

  // --- 2. ANTI-EVERYONE / HERE (Tolerância Zero) ---
  // A propriedade .everyone é true se a mensagem conter @everyone ou @here
  if (message.mentions.everyone) {
    violationType = "MASS_MENTION";
    warningMessage = `🐮 **${message.author}, não marca seu boi!** É proibido mencionar everyone/here.`;
  }

  // --- 3. ANTI-INVITE (Filtro Específico) ---
  // Esta Regex pega apenas links de convite do Discord.
  // Links de Tenor, Giphy, Youtube, etc., NÃO ativam isso.
  const inviteRegex =
    /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discord(app)?\.com\/invite)\/.+[a-z]/gi;

  if (!violationType && inviteRegex.test(content)) {
    violationType = "INVITE_LINK";
    warningMessage = `🚫 **${message.author}, é proibido enviar convites de outros servidores aqui!**`;
  }

  // --- AÇÃO PUNITIVA ---
  if (violationType) {
    try {
      // 1. Deleta a mensagem imediatamente
      if (message.deletable) {
        await message.delete().catch(() => {});
      }

      // 2. Envia o aviso no chat
      const embed = new EmbedBuilder()
        .setDescription(warningMessage)
        .setColor(0xff0000); // Vermelho

      const msg = await channel.send({ embeds: [embed] });

      // Apaga o aviso do bot depois de 5 segundos para não sujar o chat
      setTimeout(() => msg.delete().catch(() => {}), 5000);

      // 3. Opcional: Aplicar Timeout (Castigo) leve de 1 minuto para o usuário aprender
      if (member.moderatable) {
        // Descomente a linha abaixo se quiser que o bot dê mute automático de 5 minutos
        // await member.timeout(5 * 60 * 1000, `Auto-Mod: ${violationType}`);
      }

      return true; // Retorna true para avisar o roteador que houve violação
    } catch (error) {
      console.error(`Erro no ChatProtection: ${error.message}`);
    }
  }

  return false; // Nenhuma violação, segue o fluxo normal
};
