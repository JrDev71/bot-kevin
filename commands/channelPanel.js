// commands/channelPanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

// IDs dos Componentes (Botões, Modais e Menus)
const BTN = {
  CREATE: "btn_ch_create",
  EDIT: "btn_ch_edit",
  DELETE: "btn_ch_delete",
};
const MDL = { CREATE: "mdl_ch_create", RENAME: "mdl_ch_rename" };
const SEL = {
  DEL: "sel_ch_del",
  EDIT: "sel_ch_edit",
  TYPE: "sel_ch_type",
  CAT: "sel_ch_cat",
};

// Configuração Visual
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

// --- MODELOS DE PERMISSÃO (PRESETS) ---
// Exportado para ser usado pelo Handler na hora de criar
const CHANNEL_PRESETS = {
  // --- CATEGORIAS ---
  cat_public: {
    label: "📂 Categoria Pública",
    description: "Organização: Todos veem os canais dentro.",
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
  // --- CANAIS DE TEXTO ---
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
    label: "<:voz:1443651112644378818> Avisos (Leitura)",
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
  staff_text: {
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
      .setTitle("Infraestrutura de Canais")
      .setDescription(
        "Gerencie a estrutura do servidor (Categorias, Texto e Voz) utilizando modelos seguros.\n" +
          "Você não precisa configurar permissões manualmente."
      )
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE)
      .setThumbnail(message.guild.iconURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.CREATE)
        .setLabel("Criar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId(BTN.EDIT)
        .setLabel("Renomear")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId(BTN.DELETE)
        .setLabel("Deletar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🗑️")
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    if (message.deletable) message.delete().catch(() => {});
  },
};
