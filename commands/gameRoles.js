// commands/gameRoles.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

// CONFIG VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

module.exports = {
  sendGameRolesPanel: async (message) => {
    // Apenas Staff pode postar o painel para evitar spam
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply(
        "<:cadeado:1443642375833518194> Apenas Os Donos podem postar o painel de jogos."
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("<:controle:1443678488870785044> Selecione seus Jogos")
      .setDescription(
        "Clique nos botões abaixo para adicionar ou remover as tags de jogo no seu perfil.\n" +
          "\nIsso liberará canais e notificações específicas para cada game."
      )
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE)
      .setFooter({ text: "Sistema auto-role" });

    // Linha 1: FPS / Tiro
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_role_ff")
        .setLabel("Free Fire")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:freefire:1443689056197283982>"),
      new ButtonBuilder()
        .setCustomId("btn_role_val")
        .setLabel("Valorant")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:valorant:1439457595290292344>"),
      new ButtonBuilder()
        .setCustomId("btn_role_cs")
        .setLabel("CS:GO/2")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:cs2:1443689897998422087>")
    );

    // Linha 2: Outros
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_role_gta")
        .setLabel("GTA V")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:fiveM:1443690654612848690>"),
      new ButtonBuilder()
        .setCustomId("btn_role_roblox")
        .setLabel("Roblox")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:roblox:1443691205929078876>"),
      new ButtonBuilder()
        .setCustomId("btn_role_mine")
        .setLabel("Minecraft")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:minecraft:1443692753958600898>")
    );

    await message.channel.send({ embeds: [embed], components: [row1, row2] });

    if (message.deletable) message.delete().catch(() => {});
  },
};
