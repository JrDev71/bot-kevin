// commands/booster.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { ensureBooster } = require("../boosterManager");

// IDs dos Botões
const BTN_TAG = "boost_tag";
const BTN_CHANNEL = "boost_channel";
const BTN_ADD = "boost_add";

// Config Visual
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443770029354127451/banner-vip-booster.png?ex=692a471e&is=6928f59e&hm=2dc7967ad2cde87a2a4bc015e97d7abbc75362ab40f798fb7949c6d32fdf7dda";
const COLOR_PINK = 0xf47fff; // Rosa Nitro

module.exports = {
  BTN_TAG,
  BTN_CHANNEL,
  BTN_ADD,

  handleBoosterPanel: async (message) => {
    const member = message.member;

    // Verifica se é Booster (premiumSince é a data do boost, null se não for)
    if (!member.premiumSince) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("<:rainbownitro:1443768547347136625> Área Restrita")
            .setDescription(
              "Este painel é exclusivo para **Server Boosters**.\nImpulsione o servidor para desbloquear!"
            )
            .setColor(0x2f3136),
        ],
      });
    }

    // Garante que o booster exista no banco
    const data = await ensureBooster(member.id);

    const embed = new EmbedBuilder()
      .setTitle(`<:rainbownitro:1443768547347136625> Painel Booster VIP`)
      .setDescription(
        `Obrigado pelo boost, **${member.user.username}**! Configure seus benefícios.`
      )
      .setColor(COLOR_PINK)
      .setImage(HEADER_IMAGE)
      .addFields(
        {
          name: "<:label:1443650019562622976> Tag",
          value: data.customRoleId
            ? `<@&${data.customRoleId}>`
            : "<:Nao:1443642030637977743>",
          inline: true,
        },
        {
          name: "<:voz:1443651112644378818> Canal",
          value: data.customChannelId
            ? `<#${data.customChannelId}>`
            : "<:Nao:1443642030637977743>",
          inline: true,
        },
        { name: "👥 Convidados", value: `${data.friends.length}`, inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN_TAG)
        .setLabel("Tag Booster")
        .setEmoji("<:label:1443650019562622976>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(BTN_CHANNEL)
        .setLabel("Canal Booster")
        .setEmoji("<:voz:1443651112644378818>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(BTN_ADD)
        .setLabel("Add Amigo")
        .setEmoji("👥")
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  },
};
