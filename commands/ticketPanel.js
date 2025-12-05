// commands/ticketPanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

const BTN_OPEN = "btn_ticket_open";

// CONFIG VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1446478914468974742/ticket-banner.png?ex=693421f7&is=6932d077&hm=cf586cf1ba2ae3770bcc3d436cbbf044df522986ead23ff6cbff17e876d07570&";
const COLOR_NEUTRAL = 0x2f3136;

module.exports = {
  BTN_OPEN,

  handleTicketPanel: async (message) => {
    // Verifica se é staff
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply("<:cadeado:1443642375833518194> Apenas Moderação.");
    }

    // Pega o canal configurado no .env
    const parentId = message.client.config.TICKET_PARENT_CHANNEL_ID;
    const targetChannel = message.guild.channels.cache.get(parentId);

    if (!targetChannel)
      return message.reply(
        "<:am_avisoK:1443645307358544124> Canal Pai de Tickets não configurado ou não encontrado no `.env`."
      );

    const embed = new EmbedBuilder()
      .setTitle("<:W_Ticket:1446489399897358336> Central de Atendimento")
      .setDescription(
        "Precisa de algo? o <@728192519476740096> vai lhe atender.\n" +
          "**Clique no botão abaixo**.\n\n" +
          "Um atendimento privado será aberto neste mesmo canal."
      )
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE)
      .setThumbnail(message.guild.iconURL())
      .setFooter({ text: "Sistema de Suporte via Threads" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN_OPEN)
        .setLabel("Abrir Chamado")
        .setEmoji("<:W_Ticket:1446489399897358336>")
        .setStyle(ButtonStyle.Secondary)
    );

    await targetChannel.send({ embeds: [embed], components: [row] });
    if (message.channel.id !== targetChannel.id) {
      message.reply(`✅ Painel enviado para ${targetChannel}.`);
    }
    if (message.deletable) message.delete().catch(() => {});
  },
};
