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
// Adicionamos SEL.CAT para selecionar a categoria pai
const SEL = {
  DEL: "sel_ch_del",
  EDIT: "sel_ch_edit",
  TYPE: "sel_ch_type",
  CAT: "sel_ch_cat",
};

// --- MODELOS DE PERMISSÃO ---
const CHANNEL_PRESETS = {
  // --- CATEGORIAS ---
  cat_public: {
    label: "📂 Categoria Pública",
    description: "Todos veem os canais dentro.",
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
    description: "Apenas Staff vê.",
    type: ChannelType.GuildCategory,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  },
  // --- CANAIS DE TEXTO ---
  public_text: {
    label: "💬 Chat Público",
    description: "Texto: Todos leem e escrevem.",
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
    description: "Texto: Todos leem, ninguém fala.",
    type: ChannelType.GuildText,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
        deny: [PermissionsBitField.Flags.SendMessages],
      },
    ],
  },
  staff_text: {
    // <--- ESTE ESTAVA FALTANDO OU NÃO APARECENDO
    label: "🕵️ Chat Staff (Privado)",
    description: "Texto: Invisível para membros.",
    type: ChannelType.GuildText,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  },
  // --- CANAIS DE VOZ ---
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
  staff_voice: {
    // <--- ESTE TAMBÉM
    label: "🔒 Voz Staff (Privado)",
    description: "Voz: Apenas Staff conecta.",
    type: ChannelType.GuildVoice,
    overwrites: (guild) => [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
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
      .setTitle("🎛️ Infraestrutura (Zero Trust)")
      .setDescription(
        "Gerencie a estrutura do servidor.\n\n" +
          "**1.** Clique em Criar.\n**2.** Escolha Nome e Tipo.\n**3.** Escolha a Categoria.\n**4.** Escolha a Permissão."
      )
      .setColor(0x2b2d31)
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
