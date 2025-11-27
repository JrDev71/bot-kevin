// commands/nuke.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  handleNuke: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    )
      return message.reply(
        "❌ Você precisa de permissão de **Gerenciar Canais**."
      );

    const channel = message.channel;
    const position = channel.position;

    // Cria um clone do canal com as mesmas configurações
    const newChannel = await channel.clone();

    // Define a posição correta e envia o aviso
    await newChannel.setPosition(position);
    await channel.delete();

    const nukeEmbed = new EmbedBuilder()
      .setTitle("💥 CANAL RESETADO")
      .setDescription("Este canal foi recriado. O histórico foi limpo.")
      .setImage(
        "https://media1.tenor.com/m/XM_T0VX5a0AAAAAC/nuclear-bomb-explosion.gif"
      ) // Gif de explosão
      .setColor(0xff0000)
      .setFooter({ text: `Ação realizada por ${message.author.tag}` });

    await newChannel.send({ embeds: [nukeEmbed] });
  },
};
