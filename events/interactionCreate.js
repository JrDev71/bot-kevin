// events/interactionCreate.js

// --- IMPORTAÇÃO DOS HANDLERS (Os Operários) ---
const handleSlashCommand = require("../handlers/slashHandler");
const handleVerification = require("../handlers/verificationHandler");
const handleStopGame = require("../handlers/stopGameHandler");
const handleVip = require("../handlers/vipHandler");
const handleChannelManagement = require("../handlers/channelHandler");
const handleModInteractions = require("../handlers/modHandler");

// O Handler de Cargos está no arquivo de comando
const { handleRoleInteractions } = require("../commands/rolePanel");

module.exports = async (interaction) => {
  try {
    // 1. Slash Commands (/ping)
    // Se for comando de barra, o slashHandler resolve e paramos aqui.
    if (interaction.isCommand()) {
      await handleSlashCommand(interaction);
      return;
    }

    // Para botões e modais, passamos para cada handler.
    // Se o handler retornar 'true', significa que ele cuidou da interação, então paramos.

    // 2. Sistema de Verificação (Entrada)
    if (await handleVerification(interaction)) return;

    // 3. Jogo Stop
    if (await handleStopGame(interaction)) return;

    // 4. Sistema VIP
    if (await handleVip(interaction)) return;

    // 5. Painel de Infraestrutura (Canais)
    if (await handleChannelManagement(interaction)) return;

    // 6. Painel de Moderação
    if (await handleModInteractions(interaction)) return;

    // 7. Painel de Cargos
    if ((await handleRoleInteractions(interaction)) !== false) return;
  } catch (error) {
    console.error("Erro Fatal no interactionCreate:", error);
    // Evita erro de "Interação falhou" no Discord se ninguém respondeu
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
