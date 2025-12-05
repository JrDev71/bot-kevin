// events/messageCreate.js
const { EmbedBuilder } = require("discord.js");

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
const { handleListMembers } = require("../commands/listMembers");
const { handleVoice } = require("../commands/voice"); // <--- ADICIONADO

// --- NOVOS PAINÉIS VISUAIS ---
const { sendRolePanel } = require("../commands/rolePanel"); // k!cargo (Admin)
const { handleChannelPanel } = require("../commands/channelPanel"); // k!canal
const { handleModPanel } = require("../commands/modPanel"); // k!mod
const { sendGameRolesPanel } = require("../commands/gameRoles"); // k!roles (Jogos) <--- ADICIONADO
const { handleBoosterPanel } = require("../commands/booster"); // k!booster <--- ADICIONADO
const { handleEconomy } = require("../commands/economy");
const { handleGambling } = require("../commands/gambling");
const { handleCrime } = require("../commands/crime");
const { handleTicketPanel } = require("../commands/ticketPanel");

const PREFIX = "k!";

// Helper Visual
const createFeedbackEmbed = (title, description, color = 0xff0000) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
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
                    `Todas as respostas devem começar com a letra **${currentLetter}**!`,
                    0x00bfff
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
  if (["booster", "boost"].includes(command))
    return handleBoosterPanel(message); // <--- NOVO

  // --- SISTEMA DE PROTEÇÃO ---
  if (["panela", "blacklist"].includes(command))
    return handleProtection(message, command, args);
  if (["pd", "setpd", "removepd"].includes(command))
    return handlePDCommand(message, command, args);

  // --- PAINÉIS DE GESTÃO ---
  if (["cargo", "cargosadmin"].includes(command)) return sendRolePanel(message);
  if (["canal", "canais", "infra"].includes(command))
    return handleChannelPanel(message);
  if (["mod", "punir", "justice"].includes(command))
    return handleModPanel(message);

  // --- MODERAÇÃO MANUAL ---
  if (command === "ban") return handleBan(message, args);
  if (command === "unban") return handleUnban(message, args);
  if (command === "kick") return handleKick(message, args);
  if (command === "nuke") return handleNuke(message);
  if (command === "mute") return handleMute(message, args);
  if (command === "unmute") return handleUnmute(message, args);
  if (command === "prender") return handleJail(message, args);
  if (command === "soltar") return handleUnjail(message, args);

  // --- LOCKDOWN ---
  if (["lock", "trancar"].includes(command)) return handleLockdown(message);
  if (["lockall", "trancartudo"].includes(command))
    return handleLockdownAll(message);
  if (["unlock", "destrancar"].includes(command))
    return handleUnlockdown(message);
  if (["unlockall", "destrancartudo"].includes(command))
    return handleUnlockdownAll(message);

  // --- SISTEMA DE VOZ ---
  if (["join", "entrar", "leave", "sair"].includes(command))
    return handleVoice(message, args, command); // <--- NOVO

  // --- UTIL ---
  if (command === "av") return handleAvatar(message, args);
  if (command === "repeat") return handleRepeat(message, args);
  if (["membros", "listmembers", "list"].includes(command))
    return handleListMembers(message, args); // --- PAINEL DE JOGOS (AUTO-ROLE) ---

  if (["roles", "cargos", "jogos"].includes(command)) {
    return sendGameRolesPanel(message); // <--- NOVO
  }

  if (["ticket", "suporte", "atendimento"].includes(command)) {
    return handleTicketPanel(message);
  }

  // --- ECONOMIA ---
  if (
    [
      "atm",
      "saldo",
      "carteira",
      "daily",
      "work",
      "trabalhar",
      "pay",
      "pagar",
      "rank",
      "leaderboard",
      "top",
      "eco",
    ].includes(command)
  ) {
    return handleEconomy(message, command, args);
  }

  if (["slot", "slots", "mines"].includes(command)) {
    return handleGambling(message, command, args);
  }

  // --- CRIME & LOJA ---
  if (["loja", "comprar", "roubar", "rob"].includes(command)) {
    return handleCrime(message, command, args);
  }

  // --- JOGO STOP ---

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
  } // --- RESPOSTA STOP OBSOLETA ---

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
