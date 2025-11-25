// events/interactionCreate.js

// --- IMPORTAÇÃO DOS HANDLERS (Módulos de Interação) ---
const handleSlashCommand = require("../handlers/slashHandler"); // Slash Commands (/ping)
const handleVerification = require("../handlers/verificationHandler"); // Botão Verificar/Aprovar
const handleStopGame = require("../handlers/stopGameHandler"); // Jogo Stop
const handleVip = require("../handlers/vipHandler"); // Painel VIP
const handleChannelManagement = require("../handlers/channelHandler"); // Painel de Canais
const handleModInteractions = require("../handlers/modHandler"); // Painel de Moderação (NOVO)

// O Handler de Cargos está dentro do arquivo de comando (Exceção)
const { handleRoleInteractions } = require("../commands/rolePanel"); // Painel de Cargos

module.exports = async (interaction) => {
  try {
    // 1. Tenta tratar Slash Commands
    await handleSlashCommand(interaction);
    if (interaction.replied || interaction.deferred) return;

    // 2. Tenta tratar Verificação
    if (await handleVerification(interaction)) return;

    // 3. Tenta tratar Jogo Stop
    if (await handleStopGame(interaction)) return;

    // 4. Tenta tratar Sistema VIP
    if (await handleVip(interaction)) return;

    // 5. Painel de Infraestrutura/Canais
    if (await handleChannelManagement(interaction)) return;

    // 6. Painel de Moderação (NOVO)
    if (await handleModInteractions(interaction)) return;

    // 7. Painel de Cargos
    // (Este handler retorna false se não processar, então checamos o retorno)
    try {
      if ((await handleRoleInteractions(interaction)) !== false) return;
    } catch (e) {
      // Ignora erro se não for botão de cargo
    }
  } catch (error) {
    console.error("Erro Fatal no interactionCreate:", error);
    // Tenta responder apenas se ainda não houve resposta para não deixar o bot "pensando"
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content:
            "❌ Ocorreu um erro interno crítico ao processar sua interação.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
};
