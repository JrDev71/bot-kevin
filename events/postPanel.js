const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

async function postVerificationPanel(client, VERIFICATION_CHANNEL_ID) {
  const channel = client.channels.cache.get(VERIFICATION_CHANNEL_ID);
  if (!channel) {
    return console.error(
      "Canal de verificação não encontrado. Verifique o ID no .env."
    );
  }

  const LOGO_URL =
    "https://media.discordapp.net/attachments/1435040616831782922/1435059494228066445/3238061aac6396f0246f33fe01cb283c.jpg?ex=690b3f8d&is=6909ee0d&hm=df6cdbe2ad8a76d54ea65ce608ac454627a4e2c0431bb826e3b87f799db5aefa&=&format=webp&width=450&height=442";
  const VERIFY_BUTTON_ID = "start_verification";

  const embed = new EmbedBuilder()
    .setTitle("✅ Verificação de Membro")
    .setDescription("SÓ MLK BOM, OS MENO MAIS QUENTE!! FORA PANELEIROS")
    .setColor(0x00ff00)
    .setImage(LOGO_URL);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel("Verificar")
      .setStyle(ButtonStyle.Primary)
  );

  const messages = await channel.messages.fetch({ limit: 5 });
  if (
    !messages.some((m) =>
      m.embeds.some((e) => e.title === "✅ Verificação de Membro")
    )
  ) {
    await channel.send({ embeds: [embed], components: [row] });
    console.log("Painel de verificação postado.");
  }
}

module.exports = { postVerificationPanel };
