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
// REMOVIDO: handleBadWords

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
} = require("../commands/lockdown");

const PREFIX = "k!";

// Emojis para o comando Roles
const EMOJIS = {
  FREEFIRE_ID: "1437889904406433974",
  VALORANT_ID: "1437889927613517975",
};

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

  // (Filtro de Palavras removido conforme solicitado)

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

  if (["help", "ajuda", "comandos"].includes(command))
    return handleHelp(message);
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

  // Moderação Básica
  if (command === "ban") return handleBan(message, args);
  if (command === "unban") return handleUnban(message, args);
  if (command === "kick") return handleKick(message, args);
  if (command === "nuke") return handleNuke(message);

  // Moderação Temporal
  if (command === "mute") return handleMute(message, args);
  if (command === "unmute") return handleUnmute(message, args);
  if (command === "prender") return handleJail(message, args);
  if (command === "soltar") return handleUnjail(message, args);

  // Lockdown (Incluindo lockall)
  if (command === "lock") return handleLockdown(message);
  if (command === "lockall") return handleLockdownAll(message);
  if (command === "unlock") return handleUnlockdown(message);

  // Sistemas Diversos
  if (["pd", "setpd", "removepd"].includes(command))
    return handlePDCommand(message, command, args);
  if (command === "av") return handleAvatar(message, args);
  if (command === "repeat") return handleRepeat(message, args); // --- PAINEL DE CARGOS ---

  if (command === "roles" || command === "cargos") {
    if (!message.member.permissions.has("MANAGE_GUILD")) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "🔒 Sem Permissão",
            `Requer **Gerenciar Servidor**.`
          ),
        ],
      });
    }
    const freefireEmoji = message.guild.emojis.cache.get(EMOJIS.FREEFIRE_ID);
    const valorantEmoji = message.guild.emojis.cache.get(EMOJIS.VALORANT_ID);
    const rolePanelEmbed = new EmbedBuilder()
      .setTitle("🎮 Escolha seu Jogo")
      .setDescription(
        `Reaja de acordo com seu jogo:\n\n${
          freefireEmoji || "FREEFIRE"
        } — Cargo de Free Fire\n${
          valorantEmoji || "VALORANT"
        } — Cargo de Valorant\n\n*Você pode remover o cargo tirando a reação.*`
      )
      .setColor(0x9b59b6)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setTimestamp();
    try {
      const sentMessage = await message.channel.send({
        embeds: [rolePanelEmbed],
      });
      await sentMessage.react(EMOJIS.FREEFIRE_ID);
      await sentMessage.react(EMOJIS.VALORANT_ID);
      return message.author
        .send({
          embeds: [
            createFeedbackEmbed(
              "✅ Painel Postado",
              `ID da Mensagem: \`${sentMessage.id}\`\nAtualize o \`.env\` e reinicie.`,
              0x00ff00
            ),
          ],
        })
        .catch(() => {});
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
    await message.channel.send(
      `✅ **STOP!** Rodada encerrada. Iniciando revisão...`
    );
    await postReviewEmbed(state, message.channel);
  } // --- RESPOSTA STOP OBSOLETA ---

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
