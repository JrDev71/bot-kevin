// events/interactionCreate.js

// Importa os handlers modulares
const handleSlashCommand = require("../handlers/slashHandler");
const handleVerification = require("../handlers/verificationHandler");
const handleStopGame = require("../handlers/stopGameHandler");
const handleVip = require("../handlers/vipHandler");

module.exports = async (interaction) => {
  try {
    // 1. Tenta tratar Slash Commands (/ping)
    await handleSlashCommand(interaction);
    if (interaction.replied || interaction.deferred) return;

    // 2. Tenta tratar Verificação (Botões e Modais)
    if (await handleVerification(interaction)) return;

    // 3. Tenta tratar Jogo Stop (Botões e Modais)
    if (await handleStopGame(interaction)) return;

    // 4. Tenta tratar Sistema VIP (Painel e Modais)
    if (await handleVip(interaction)) return;
  } catch (error) {
    console.error("Erro no interactionCreate:", error);
    // Tenta responder apenas se ainda não houve resposta
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Ocorreu um erro interno ao processar sua interação.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
};
