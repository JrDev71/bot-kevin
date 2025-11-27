// commands/modPanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

const BTN = {
  PUNISH: "btn_mod_punish",
  CHAT: "btn_mod_chat",
  NUKE: "btn_mod_nuke",
};

// CONFIG VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

function canModerate(member) {
  const trustedRoles = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some((r) => trustedRoles.includes(r.id))
  );
}

module.exports = {
  BTN,
  handleModPanel: async (message) => {
    if (!canModerate(message.member))
      return message.reply("<:cadeado:1443642375833518194> Sem permissão.");

    const embed = new EmbedBuilder()
      .setTitle("Painel de Moderação")
      .setDescription("Central de Justiça e Controle de Chat.")
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE)
      .setFooter({ text: "Sistema de Segurança Integrado" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.PUNISH)
        .setLabel("Punir Usuário")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔨"),
      new ButtonBuilder()
        .setCustomId(BTN.CHAT)
        .setLabel("Gerenciar Chat")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("💬"),
      // Nuke mantido em Danger (Vermelho) por segurança visual, ou mude para Secondary se preferir tudo cinza
      new ButtonBuilder()
        .setCustomId(BTN.NUKE)
        .setLabel("Nuke Canal")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("☢️")
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    if (message.deletable) message.delete().catch(() => {});
  },
};
