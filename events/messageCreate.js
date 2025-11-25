// events/messageCreate.js
const { EmbedBuilder } = require("discord.js");

// --- IMPORTAÇÕES DOS SISTEMAS ---
const { getGameState } = require("../game/gameState");
const { startRound } = require("../game/gameManager");
const { postReviewEmbed } = require("../game/scoreSystem");
const { handlePDCommand } = require("../pdManager");

// --- HANDLERS DE SEGURANÇA ---
const handleMention = require("../handlers/mentionHandler");
const handleAntiSpam = require("../handlers/antiSpamHandler");
const handleChatProtection = require("../handlers/chatProtectionHandler");

// --- COMANDOS GERAIS ---
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

// --- PAINÉIS (Aqui estava o erro antes) ---
const { sendRolePanel } = require("../commands/rolePanel");
const { handleChannelPanel } = require("../commands/channelPanel");
const { handleModPanel } = require("../commands/modPanel");

const PREFIX = "k!";

// Helper visual
const createFeedbackEmbed = (title, description, color = 0xff0000) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
};

module.exports = async (message) => {
  if (message.author.bot) return;

  // 1. SEGURANÇA
  if (await handleChatProtection(message)) return;
  if (await handleAntiSpam(message)) return;

  // 2. MENÇÃO E JOGO STOP (Resposta Rápida)
  const state = getGameState(message.guild.id);
  const userId = message.author.id;

  if (await handleMention(message)) return;

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
                    `Comece com a letra **${currentLetter}**!`
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

  // 3. EXCLUSÃO DE COMANDO
  if (message.deletable) {
    try {
      await message.delete();
    } catch (error) {
      if (error.code !== 10008) console.error("Erro delete:", error);
    }
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  // ==========================
  // ROTEAMENTO DE COMANDOS
  // ==========================

  // --- PAINÉIS GERAIS (Prioridade) ---
  // Chama os arquivos que você criou. Não tenta rodar lógica aqui dentro.
  if (["cargo", "cargos", "roles"].includes(command))
    return sendRolePanel(message);
  if (["canal", "canais", "infra"].includes(command))
    return handleChannelPanel(message);
  if (["mod", "punir", "justice"].includes(command))
    return handleModPanel(message);

  // --- SISTEMAS ---
  if (["help", "ajuda", "comandos"].includes(command))
    return handleHelp(message);
  if (["sistemas", "botinfo"].includes(command)) return handleBotInfo(message);
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
  if (["panela", "blacklist"].includes(command))
    return handleProtection(message, command, args);
  if (["pd", "setpd", "removepd"].includes(command))
    return handlePDCommand(message, command, args);

  // --- MODERAÇÃO MANUAL ---
  if (command === "ban") return handleBan(message, args);
  if (command === "unban") return handleUnban(message, args);
  if (command === "kick") return handleKick(message, args);
  if (command === "nuke") return handleNuke(message);
  if (command === "mute") return handleMute(message, args);
  if (command === "unmute") return handleUnmute(message, args);
  if (command === "prender") return handleJail(message, args);
  if (command === "soltar") return handleUnjail(message, args);
  if (["lock", "trancar"].includes(command)) return handleLockdown(message);
  if (["lockall", "trancartudo"].includes(command))
    return handleLockdownAll(message);
  if (["unlock", "destrancar"].includes(command))
    return handleUnlockdown(message);
  if (["unlockall", "destrancartudo"].includes(command))
    return handleUnlockdownAll(message);

  // --- UTIL ---
  if (command === "av") return handleAvatar(message, args);
  if (command === "repeat") return handleRepeat(message, args); // --- JOGO STOP ---

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
        createFeedbackEmbed("✅ STOP!", "Rodada encerrada manualmente."),
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
            `Envie suas respostas direto no chat.`
          ),
        ],
      })
      .then((m) => setTimeout(() => m.delete(), 5000));
  }
};
