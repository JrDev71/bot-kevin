// events/interactionCreate.js
const { EmbedBuilder } = require("discord.js");

// --- IMPORTAÇÃO DOS HANDLERS (Módulos de Interação) ---
const handleSlashCommand = require("../handlers/slashHandler"); // Slash Commands
const handleVerification = require("../handlers/verificationHandler"); // Botão Verificar/Aprovar
const handleStopGame = require("../handlers/stopGameHandler"); // Jogo Stop
const handleVip = require("../handlers/vipHandler"); // Painel VIP
const handleChannelManagement = require("../handlers/channelHandler"); // Painel de Canais (Infra)
const handleModInteractions = require("../handlers/modHandler"); // Painel de Moderação (Justiça)

// O Handler de Gestão de Cargos (k!cargo) está dentro do arquivo de comando
const { handleRoleInteractions } = require("../commands/rolePanel");

// --- CONFIGURAÇÃO VISUAL ---
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const NEUTRAL_COLOR = 0x2f3136;

// Helper para Embeds Rápidos
const createResponseEmbed = (title, description, color = NEUTRAL_COLOR) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
};

module.exports = async (interaction) => {
  try {
    // 1. Tenta tratar Slash Commands (/ping)
    await handleSlashCommand(interaction);
    if (interaction.replied || interaction.deferred) return;

    // 2. Tenta tratar Verificação (Entrada)
    if (await handleVerification(interaction)) return;

    // 3. Tenta tratar Jogo Stop
    if (await handleStopGame(interaction)) return;

    // 4. Tenta tratar Sistema VIP
    if (await handleVip(interaction)) return;

    // 5. Painel de Canais (k!canal)
    if (await handleChannelManagement(interaction)) return;

    // 6. Painel de Moderação (k!mod)
    if (await handleModInteractions(interaction)) return;

    // 7. Painel de Gestão de Cargos (k!cargo)
    try {
      if ((await handleRoleInteractions(interaction)) !== false) return;
    } catch (e) {
      // Ignora erros se não for interação deste painel
    }

    // 8. AUTO-ROLE (Botões de Jogos do k!roles)
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("btn_role_")
    ) {
      await interaction.deferReply({ ephemeral: true });

      const config = interaction.client.config;
      const roleMap = {
        btn_role_ff: config.FREEFIRE_ROLE_ID,
        btn_role_val: config.VALORANT_ROLE_ID,
        btn_role_cs: config.CS_ROLE_ID,
        btn_role_roblox: config.ROBLOX_ROLE_ID,
        btn_role_gta: config.GTA_ROLE_ID,
        btn_role_mine: config.MINECRAFT_ROLE_ID,
      };

      const roleId = roleMap[interaction.customId];

      // Validação de Configuração
      if (!roleId) {
        return interaction.editReply({
          embeds: [
            createResponseEmbed(
              "⚠️ Erro",
              "O ID deste cargo não foi configurado no `.env`.",
              0xffa500
            ),
          ],
        });
      }

      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.editReply({
          embeds: [
            createResponseEmbed(
              "❌ Erro",
              "O cargo configurado não existe mais no servidor.",
              0xff0000
            ),
          ],
        });
      }

      // Lógica de Toggle (Adicionar/Remover)
      try {
        if (interaction.member.roles.cache.has(roleId)) {
          await interaction.member.roles.remove(roleId);
          return interaction.editReply({
            embeds: [
              createResponseEmbed(
                "➖ Cargo Removido",
                `Você removeu o cargo **${role.name}** do seu perfil.`,
                0xe74c3c
              ),
            ],
          });
        } else {
          await interaction.member.roles.add(roleId);
          return interaction.editReply({
            embeds: [
              createResponseEmbed(
                "➕ Cargo Adicionado",
                `Você recebeu o cargo **${role.name}**!`,
                0x2ecc71
              ),
            ],
          });
        }
      } catch (error) {
        console.error("Erro no Auto-Role:", error);
        return interaction.editReply({
          embeds: [
            createResponseEmbed(
              "🚫 Acesso Negado",
              "Não consegui alterar seu cargo. Verifique se o meu cargo está acima do cargo do jogo na lista.",
              0xff0000
            ),
          ],
        });
      }
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
