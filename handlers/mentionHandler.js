// handlers/mentionHandler.js
const { EmbedBuilder } = require("discord.js");
const PREFIX = "k!";

module.exports = async (message) => {
  // Checa se a mensagem é uma menção direta ao bot
  if (!message.mentions.has(message.client.user.id)) return false;

  // Lógica da Resposta (Embed de Apresentação)
  const mentionEmbed = new EmbedBuilder()
    .setTitle("🤖 Olá! Eu sou o MC KEVIN.")
    .setDescription(
      "Fui desenvolvido com o objetivo de gerenciar a **verificação de novos membros** e automatizar algumas tarefas."
    )
    .addFields(
      {
        name: "Criador/Desenvolvedor:",
        value: "jerry",
        inline: true,
      },
      { name: "Prefixo de Comando:", value: `\`${PREFIX}\``, inline: true }
    )
    .setColor(0x3498db)
    .setTimestamp();

  await message.reply({ embeds: [mentionEmbed] });
  return true; // Retorna true para sinalizar que a mensagem foi processada
};
