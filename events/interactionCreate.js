// events/interactionCreate.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

// --- IMPORTAÇÃO DOS HANDLERS (Módulos de Interação) ---
const handleSlashCommand = require("../handlers/slashHandler"); // Slash Commands
const handleVerification = require("../handlers/verificationHandler"); // Verificação
const handleStopGame = require("../handlers/stopGameHandler"); // Jogo Stop
const handleVip = require("../handlers/vipHandler"); // Painel VIP
const handleBooster = require("../handlers/boosterHandler"); // Painel Booster (NOVO)
const handleChannelManagement = require("../handlers/channelHandler"); // Painel de Canais (Infra)
const handleModInteractions = require("../handlers/modHandler"); // Painel de Moderação (Justiça)
const handleGameRoles = require("../handlers/gameRoleHandler"); // Painel de Jogos (Auto-Role)
const handleGamblingInteract = require("../handlers/gamblingHandler");
const handleTicket = require("../handlers/ticketHandler");

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

    // 3. Tenta tratar Jogo Stop
    if (await handleStopGame(interaction)) return;

    // 4. Tenta tratar Sistema VIP
    if (await handleVip(interaction)) return;

    // 5. Tenta tratar Sistema Booster (NOVO)
    if (await handleBooster(interaction)) return;

    // 6. Painel de Infraestrutura/Canais (k!canal)
    if (await handleChannelManagement(interaction)) return;

    // 7. Painel de Moderação (k!mod)
    if (await handleModInteractions(interaction)) return;

    // 8. Seleção de Jogos (Auto-Role / k!jogos)
    if (await handleGameRoles(interaction)) return;

    if (await handleGamblingInteract(interaction)) return;
    if (await handleTicket(interaction)) return;

    // 9. Painel de Gestão de Cargos (k!cargo)
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
