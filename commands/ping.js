// commands/ping.js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  // Estrutura de dados exigida pelo Discord para registro
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Responde com Pong para verificar a latência do bot."),

  // Lógica de execução
  async execute(interaction) {
    // Deferir imediatamente para evitar o timeout de 3s
    await interaction.deferReply();

    // Calcula a latência da API do Discord (web socket)
    const latency = interaction.client.ws.ping;

    // Calcula a latência do bot (tempo de processamento)
    const botLatency = Date.now() - interaction.createdTimestamp;

    await interaction.editReply(
      `🏓 Pong! Latência da API: **${latency}ms**. Latência do Bot: **${botLatency}ms**.`
    );
  },
};
