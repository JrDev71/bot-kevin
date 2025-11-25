// events/messageCreate.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// --- IMPORTAÇÕES DOS SISTEMAS DE JOGO E ESTADO ---
const { getGameState } = require("../game/gameState");
const { calculateScores, postReviewEmbed } = require("../game/scoreSystem");
const { startRound } = require("../game/gameManager");
const { handlePDCommand } = require("../pdManager");

// --- IMPORTAÇÕES DE HANDLERS (SEGURANÇA) ---
const handleMention = require("../handlers/mentionHandler");
const handleAntiSpam = require("../handlers/antiSpamHandler");
const handleChatProtection = require("../handlers/chatProtectionHandler");

// --- IMPORTAÇÕES DOS COMANDOS (Módulos externos) ---
const { handleAvatar } = require("../commands/avatar");
const { handleRepeat } = require("../commands/repeat");
const { handleVipCommands } = require("../commands/vip");
const { handleProtection } = require("../commands/protection");
const { handleBan, handleUnban, handleKick } = require("../commands/modBasic");
const { handleNuke } = require("../commands/nuke");
const {
  handleMute,
  handleUnmute,
  handleJail,
  handleUnjail,
} = require("../commands/timeMod");
const { handleHelp } = require("../commands/help");
const {
  handleLockdown,
  handleUnlockdown,
  handleLockdownAll,
  handleUnlockdownAll,
} = require("../commands/lockdown");
const { handleBotInfo } = require("../commands/botinfo");

const PREFIX = "k!";

// URL da imagem de cabeçalho padronizada
const HEADER_IMAGE_URL =
  "https://i.pinimg.com/736x/3b/69/7c/3b697c884965fa5d817d34745aa71b29.jpg";
const NEUTRAL_COLOR = 0x2f3136; // Cor cinza escura para todos os embeds

// Função auxiliar para criar embeds de feedback padronizados
const createFeedbackEmbed = (title, description) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(NEUTRAL_COLOR)
    .setImage(HEADER_IMAGE_URL) // Adiciona a imagem padrão
    .setTimestamp();
};

// --- INÍCIO DO MÓDULO ---
module.exports = async (message) => {
  if (message.author.bot) return;

  // ====================================================
  // 1. CAMADA DE SEGURANÇA (Prioridade Máxima)
  // ====================================================

  // A. Proteção de Chat (Anti-Everyone, Anti-Link)
  if (await handleChatProtection(message)) return;

  // B. Anti-Spam
  if (await handleAntiSpam(message)) return;

  // ====================================================
  // 2. LÓGICA DE JOGO E MENÇÃO
  // ====================================================

  // Obtém o estado do jogo
  const state = getGameState(message.guild.id);
  const userId = message.author.id; // A. Resposta a Menção

  if (await handleMention(message)) return;

  // B. Resposta Rápida (STOP GAME)
  if (!message.content.startsWith(PREFIX)) {
    if (state.isActive) {
      const currentLetter = state.currentLetter;

      if (state.players[userId] && state.players[userId].isStopped) return;

      const content = message.content.trim().toUpperCase();

      if (content.startsWith(currentLetter) && content.includes(",")) {
        const rawAnswers = content.split(",");
        const cleanedAnswers = rawAnswers
          .map((ans) => ans.trim().toUpperCase())
          .filter((ans) => ans.length > 0);
        const categoriesCount = state.categories.length;

        if (cleanedAnswers.length === categoriesCount) {
          const hasInvalidLetter = cleanedAnswers.some(
            (ans) => !ans.startsWith(currentLetter)
          );

          if (hasInvalidLetter) {
            return message.channel
              .send({
                embeds: [
                  createFeedbackEmbed(
                    "❌ Resposta Inválida",
                    `Todas as respostas devem começar com a letra **${currentLetter}**!`
                  ),
                ],
              })
              .then((m) => setTimeout(() => m.delete(), 5000));
          }

          state.players[userId] = {
            answers: cleanedAnswers,
            isStopped: true,
            score: 0,
          };

          await message.react("✅");
          if (message.deletable)
            try {
              await message.delete();
            } catch (e) {}
          return;
        }
      }
    }
    return;
  }

  // 3. EXCLUSÃO CENTRALIZADA DE COMANDOS
  if (message.deletable) {
    try {
      await message.delete();
    } catch (error) {
      if (error.code !== 10008) console.error("Erro delete:", error);
    }
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  // ====================================================
  // 3. ROTEAMENTO DE COMANDOS
  // ====================================================

  // --- INFO & AJUDA ---
  if (["help", "ajuda", "comandos"].includes(command))
    return handleHelp(message);
  if (["sistemas", "botinfo"].includes(command)) return handleBotInfo(message);

  // --- SISTEMA VIP ---
  if (
    [
      "vip",
      "vipadm",
      "setvip",
      "addvip",
      "remvip",
      "addtime",
      "renovar",
    ].includes(command)
  )
    return handleVipCommands(message, command, args);

  // --- SISTEMA DE PROTEÇÃO ---
  if (["panela", "blacklist"].includes(command))
    return handleProtection(message, command, args);

  // --- MODERAÇÃO BÁSICA ---
  if (command === "ban") return handleBan(message, args);
  if (command === "unban") return handleUnban(message, args);
  if (command === "kick") return handleKick(message, args);
  if (command === "nuke") return handleNuke(message);

  // --- MODERAÇÃO TEMPORAL ---
  if (command === "mute") return handleMute(message, args);
  if (command === "unmute") return handleUnmute(message, args);
  if (command === "prender") return handleJail(message, args);
  if (command === "soltar") return handleUnjail(message, args);

  // --- LOCKDOWN ---
  if (command === "lock") return handleLockdown(message);
  if (command === "lockall") return handleLockdownAll(message);
  if (command === "unlock") return handleUnlockdown(message);
  if (command === "unlockall") return handleUnlockdownAll(message);

  // --- PD MANAGER ---
  if (["pd", "setpd", "removepd"].includes(command))
    return handlePDCommand(message, command, args);

  // --- AVATAR ---
  if (command === "av") return handleAvatar(message, args);

  // --- REPEAT ---
  if (command === "repeat") return handleRepeat(message, args);

  // --- PAINEL DE CARGOS (ROLES) ---
  if (command === "roles" || command === "cargos") {
    // ... (verificação de permissão mantida)

    const rolePanelEmbed = new EmbedBuilder()
      .setTitle("Selecione suas Roles")
      .setDescription(
        "Clique nos botões abaixo para adicionar ou remover as roles de jogo."
      )
      .setColor(NEUTRAL_COLOR)
      .setImage(HEADER_IMAGE_URL) // Imagem de cabeçalho
      .setTimestamp();

    // Cria botões cinza (Secondary) em vez de reações
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_role_freefire")
        .setLabel("Free Fire")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("btn_role_valorant")
        .setLabel("Valorant")
        .setStyle(ButtonStyle.Secondary)
    );

    try {
      await message.channel.send({
        embeds: [rolePanelEmbed],
        components: [row],
      });
    } catch (error) {
      console.error("Erro Roles:", error);
      return message.channel.send({
        embeds: [createFeedbackEmbed("❌ Erro", "Falha ao postar painel.")],
      });
    }
  } // --- JOGO STOP ---

  if (command === "stop") {
    if (state.isActive)
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "🛑 Jogo Ativo",
            `Já existe um jogo ativo (Letra **${state.currentLetter}**).`
          ),
        ],
      });
    await startRound(message, state, true);
    return;
  }
  if (command === "parar") {
    if (!state.isActive)
      return message.channel.send({
        embeds: [createFeedbackEmbed("❌ Jogo Inativo", `Não há jogo ativo.`)],
      });
    clearTimeout(state.timer);
    state.isActive = false;
    await message.channel.send({
      embeds: [
        createFeedbackEmbed(
          "✅ STOP!",
          "Rodada encerrada. Iniciando revisão..."
        ),
      ],
    });
    await postReviewEmbed(state, message.channel);
  } // --- RESPOSTA OBSOLETA ---

  if (command === "resposta" || command === "respostas") {
    return message.channel
      .send({
        embeds: [
          createFeedbackEmbed(
            "Obsoleto",
            `Não use \`${PREFIX}resposta\`! Envie direto.`
          ),
        ],
      })
      .then((m) => setTimeout(() => m.delete(), 5000));
  }
};
