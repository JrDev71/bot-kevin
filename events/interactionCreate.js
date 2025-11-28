// events/interactionCreate.js

// --- IMPORTAÇÃO DOS HANDLERS (Módulos de Interação) ---
const handleSlashCommand = require("../handlers/slashHandler"); // Slash Commands
const handleVerification = require("../handlers/verificationHandler"); // Botão Verificar/Aprovar
const handleStopGame = require("../handlers/stopGameHandler"); // Jogo Stop
const handleVip = require("../handlers/vipHandler"); // Painel VIP
const handleChannelManagement = require("../handlers/channelHandler"); // Painel de Canais (Infra)
const handleModInteractions = require("../handlers/modHandler"); // Painel de Moderação (Justiça)
const handleGameRoles = require("../handlers/gameRoleHandler"); // Painel de Jogos (Auto-Role)
const handleBooster = require("../handlers/boosterHandler"); // Import

// ... (dentro do module.exports)
if (await handleBooster(interaction)) return;

// O Handler de Gestão de Cargos (k!cargo) está dentro do arquivo de comando
const { handleRoleInteractions } = require("../commands/rolePanel");

module.exports = async (interaction) => {
  try {
    // 1. Tenta tratar Slash Commands (/ping)
    if (interaction.isCommand()) {
      await handleSlashCommand(interaction);
      return;
    }

    // Para componentes (Botões, Menus, Modais), verificamos um por um.
    // Se um handler retornar 'true', significa que ele processou a interação, então paramos.

    // 2. Sistema de Verificação (Entrada)
    if (await handleVerification(interaction)) return;

    // 3. Jogo Stop (Revisão e Botões)
    if (await handleStopGame(interaction)) return;

    // 4. Sistema VIP (Painel e Configuração)
    if (await handleVip(interaction)) return;

    // 5. Painel de Infraestrutura/Canais (k!canal)
    if (await handleChannelManagement(interaction)) return;

    // 6. Painel de Moderação (k!mod)
    if (await handleModInteractions(interaction)) return;

    // 7. Seleção de Jogos (Auto-Role / k!jogos)
    if (await handleGameRoles(interaction)) return;

    // Sistema VIP BOOSTER
    if (await handleBooster(interaction)) return;

    // 8. Painel de Gestão de Cargos (k!cargo)
    // Este handler específico retorna false se não processar
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
