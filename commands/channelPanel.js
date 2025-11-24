// commands/channelPanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

// IDs dos Botões (Exportados para o Handler)
const BTN_CH_CREATE = "btn_ch_create";
const BTN_CH_DELETE = "btn_ch_delete";
const BTN_CH_EDIT = "btn_ch_edit";

// Função para verificar permissão (Lê do .env)
function canManageChannels(member) {
  const trustedRoles = process.env.STAFF_TRUSTED_ROLES
    ? process.env.STAFF_TRUSTED_ROLES.split(",")
    : [];
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some((r) => trustedRoles.includes(r.id)) ||
    member.id === member.guild.ownerId
  );
}

module.exports = {
  BTN_CH_CREATE,
  BTN_CH_DELETE,
  BTN_CH_EDIT,

  handleChannelPanel: async (message) => {
    if (!canManageChannels(message.member)) {
      return message.reply(
        "🔒 Você não tem permissão para gerenciar canais via Bot."
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("🎛️ Infraestrutura de Canais")
      .setDescription(
        "Painel de controle para criação e edição de salas.\n" +
          "**Atenção:** Todas as ações são registradas nos logs."
      )
      .setColor(0x2b2d31) // Dark
      .addFields(
        {
          name: "➕ Criar",
          value: "Cria canais de Texto ou Voz.",
          inline: true,
        },
        { name: "✏️ Editar", value: "Renomeia o canal atual.", inline: true },
        { name: "🗑️ Deletar", value: "Apaga canais por ID.", inline: true }
      )
      .setThumbnail(message.guild.iconURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN_CH_CREATE)
        .setLabel("Criar Canal")
        .setStyle(ButtonStyle.Success)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId(BTN_CH_EDIT)
        .setLabel("Editar Atual")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId(BTN_CH_DELETE)
        .setLabel("Deletar ID")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  },
};
