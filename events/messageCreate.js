// events/messageCreate.js
const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

// IMPORTAÇÕES DOS MÓDULOS
const { getGameState } = require("../game/gameState");
const { calculateScores, postReviewEmbed } = require("../game/scoreSystem");
const { startRound } = require("../game/gameManager");
const { handlePDCommand } = require("../pdManager");

const handleMention = require("../handlers/mentionHandler");
const { handleAvatar } = require("../commands/avatar");
const { handleRepeat } = require("../commands/repeat");
const { handleRoles } = require("../commands/roles");
const PREFIX = "k!";

/**
 * Função auxiliar para criar embeds de feedback (erros/uso).
 */
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

  // Obtém o estado do jogo para o servidor atual
  const state = getGameState(message.guild.id);
  const userId = message.author.id; // --- 1. RESPOSTA A MENÇÃO (@Bot) ---

  if (await handleMention(message)) return;

  // --- LÓGICA DE COMANDO DE PREFIXO (k!) ---
  if (!message.content.startsWith(PREFIX)) {
    // Checa se é uma resposta rápida do Stop
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
          if (message.deletable) message.delete().catch(console.error);
          return;
        }
      }
    }
    return;
  }

  // EXCLUSÃO CENTRALIZADA: Deleta a mensagem de comando após o prefixo ser reconhecido
  if (message.deletable) {
    try {
      await message.delete();
    } catch (error) {
      if (error.code !== 10008) {
        console.error("Erro durante a exclusão centralizada:", error);
      }
    }
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  // ROTEAMENTO DE COMANDOS

  // --- ROTEAMENTO 1: COMANDOS PD ---
  if (["pd", "setpd", "removepd"].includes(command)) {
    return handlePDCommand(message, command, args);
  }

  // --- ROTEAMENTO 2: AVATAR ---
  if (command === "av") {
    return handleAvatar(message, args);
  }

  // --- ROTEAMENTO 3: REPEAT ---
  if (command === "repeat") {
    return handleRepeat(message, args);
  } // --- ROTEAMENTO 4: ROLES ---

  if (command === "roles" || command === "cargos") {
    return handleRoles(message);
  } // 5. Comando k!stop / k!parar (Stop Game)

  if (command === "stop") {
    if (state.isActive) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "🛑 Jogo Ativo",
            `Já existe um jogo de Stop ativo! A letra é **${state.currentLetter}**. Digite \`${PREFIX}parar\` para encerrar.`
          ),
        ],
      });
    }
    await startRound(message, state, true);
    return;
  }

  if (command === "parar") {
    if (!state.isActive) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❌ Jogo Inativo",
            `Não há nenhum jogo de Stop ativo. Use \`${PREFIX}stop\` para começar.`
          ),
        ],
      });
    } // Limpa o timer, encerra o jogo e pontua
    clearTimeout(state.timer);
    state.isActive = false;
    await message.channel.send(
      `✅ **STOP!** A rodada da letra **${state.currentLetter}** foi encerrada. Iniciando fase de revisão...`
    );
    await postReviewEmbed(state, message.channel);
  } // 6. Comando k!resposta (Obsoleto)

  if (command === "resposta" || command === "respostas") {
    return message.channel
      .send({
        embeds: [
          createFeedbackEmbed(
            "Obsoleto",
            `Não use \`${PREFIX}resposta\`! Apenas envie suas respostas separadas por vírgula quando o jogo estiver ativo.`
          ),
        ],
      })
      .then((m) => setTimeout(() => m.delete(), 5000));
  }
};
