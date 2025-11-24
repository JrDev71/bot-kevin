// events/interactionCreate.js

// --- IMPORTAÇÃO DOS HANDLERS ---
const handleSlashCommand = require("../handlers/slashHandler");
const handleVerification = require("../handlers/verificationHandler");
const handleStopGame = require("../handlers/stopGameHandler");
const handleVip = require("../handlers/vipHandler");

// Novos Handlers (Painéis de Admin)
const handleChannelManagement = require("../handlers/channelHandler");
// O handler de cargos foi criado dentro do próprio arquivo de comando
const { handleRoleInteractions } = require("../commands/rolePanel");

module.exports = async (interaction) => {
  try {
    // 1. Slash Commands (/ping)
    await handleSlashCommand(interaction);
    if (interaction.replied || interaction.deferred) return;

    // 2. Sistema de Verificação (Entrada)
    if (await handleVerification(interaction)) return;

    // 3. Jogo Stop (Revisão e Botões)
    if (await handleStopGame(interaction)) return;

    // 4. Sistema VIP (Painel e Configuração)
    if (await handleVip(interaction)) return;

    // 5. Painel de Canais (Zero Trust - k!canal)
    if (await handleChannelManagement(interaction)) return;

    // 6. Painel de Cargos (k!cargo)
    // Nota: handleRoleInteractions retorna false se não for interação dele
    if ((await handleRoleInteractions(interaction)) !== false) return;
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
