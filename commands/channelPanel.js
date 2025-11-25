// commands/channelPanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  StringSelectMenuBuilder,
} = require("discord.js");

// IDs
const BTN = {
  CREATE: "btn_ch_create",
  EDIT: "btn_ch_edit",
  DELETE: "btn_ch_delete",
};
const MDL = { CREATE: "mdl_ch_create", RENAME: "mdl_ch_rename" };
const SEL = { DEL: "sel_ch_del", EDIT: "sel_ch_edit", TYPE: "sel_ch_type" };

// --- MODELOS DE PERMISSÃO (INCLUINDO CATEGORIAS) ---
const CHANNEL_PRESETS = {
  // --- CATEGORIAS ---
  cat_public: {
    label: "📂 Categoria Pública",
    description: "Organização: Todos veem o conteúdo dentro.",
    type: ChannelType.GuildCategory,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  },
  cat_staff: {
    label: "🔐 Categoria Staff",
    description: "Organização: Apenas Staff vê o conteúdo dentro.",
    type: ChannelType.GuildCategory,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  },
  // --- CANAIS ---
  public_text: {
    label: "💬 Chat Público",
    description: "Texto: Aberto para todos.",
    type: ChannelType.GuildText,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
        ],
      },
    ],
  },
  announcement: {
    label: "📢 Avisos (Leitura)",
    description: "Texto: Apenas leitura.",
    type: ChannelType.GuildText,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
        deny: [PermissionsBitField.Flags.SendMessages],
      },
    ],
  },
  public_voice: {
    label: "🔊 Voz Pública",
    description: "Voz: Aberto para todos.",
    type: ChannelType.GuildVoice,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
        ],
      },
    ],
  },
};

function canManageChannels(member) {
  const managers = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some((r) => managers.includes(r.id)) ||
    member.id === member.guild.ownerId
  );
}

module.exports = {
  BTN,
  MDL,
  SEL,
  CHANNEL_PRESETS,

  handleChannelPanel: async (message) => {
    if (!canManageChannels(message.member))
      return message.reply("🔒 Sem permissão.");

    const embed = new EmbedBuilder()
      .setTitle("🎛️ Infraestrutura Completa (Zero Trust)")
      .setDescription("Gerencie Categorias, Canais de Texto e Voz.")
      .setColor(0x2b2d31)
      .addFields({
        name: "Modelos",
        value: "Categorias, Texto e Voz com permissões prontas.",
      })
      .setThumbnail(message.guild.iconURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.CREATE)
        .setLabel("Criar")
        .setStyle(ButtonStyle.Success)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId(BTN.EDIT)
        .setLabel("Editar")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId(BTN.DELETE)
        .setLabel("Deletar")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  },
};
