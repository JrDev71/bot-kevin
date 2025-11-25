// commands/modPanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

// IDs dos Botões
const BTN = {
  PUNISH: "btn_mod_punish", // Abre seletor de usuário
  CHAT: "btn_mod_chat", // Abre opções de chat (Lock, Clear)
  NUKE: "btn_mod_nuke", // Botão de Nuke
};

// Função de Permissão (Lê do .env)
function canModerate(member) {
  // Usa a mesma lista de Staff Trusted (ou crie uma MOD_ROLES específica se quiser)
  const trustedRoles = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some((r) => trustedRoles.includes(r.id))
  );
}

module.exports = {
  BTN,

  handleModPanel: async (message) => {
    if (!canModerate(message.member)) {
      return message.reply("🔒 Você não tem permissão de Moderação.");
    }

    const embed = new EmbedBuilder()
      .setTitle("👮 Painel de Justiça (Moderação)")
      .setDescription("Selecione uma categoria de ação abaixo.")
      .setColor(0xe74c3c) // Vermelho
      .addFields(
        {
          name: "👤 Punições",
          value: "Banir, Expulsar, Castigo (Timeout).",
          inline: true,
        },
        {
          name: "💬 Chat",
          value: "Limpar mensagens, Trancar canal.",
          inline: true,
        },
        { name: "☢️ Emergência", value: "Nuke (Recriar canal).", inline: true }
      )
      .setThumbnail(message.guild.iconURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.PUNISH)
        .setLabel("Punir Usuário")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔨"),
      new ButtonBuilder()
        .setCustomId(BTN.CHAT)
        .setLabel("Gerenciar Chat")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("💬"),
      new ButtonBuilder()
        .setCustomId(BTN.NUKE)
        .setLabel("Nuke Canal")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("☢️")
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  },
};
