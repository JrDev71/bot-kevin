// commands/repeat.js
const { EmbedBuilder } = require("discord.js");

const PREFIX = "k!";

module.exports = {
  handleRepeat: async (message, args) => {
    // Função auxiliar para criar embeds de feedback
    const createFeedbackEmbed = (title, description, color = 0xff0000) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
    };

    const textToRepeat = args.join(" ");

    if (!textToRepeat) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❓ Uso Incorreto",
            `Você precisa me dizer o que repetir! Use o formato \`${PREFIX}repeat <seu texto>\`.`
          ),
        ],
      });
    }
    await message.channel.send(textToRepeat);
  },
};
