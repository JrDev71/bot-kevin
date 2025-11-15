// game/gameManager.js
const { EmbedBuilder } = require("discord.js");
const { getGameState } = require("./gameState");
const { displayFinalScores, postReviewEmbed } = require("./scoreSystem");
const PREFIX = "k!";

/**
 * Função central para iniciar/avançar uma nova rodada de Stop.
 */
async function startRound(message, state, isNewGame = false) {
  // 1. Definição da Rodada e Reset
  if (isNewGame) {
    state.currentRound = 1;
    state.maxRounds = 3;
    state.totalScores = {};
    state.duration = state.duration || 60;
  } else {
    state.currentRound++;
  }

  // Checagem de limite e PLACAR FINAL
  if (state.currentRound > state.maxRounds) {
    state.isActive = false;
    state.currentRound = 0;

    await displayFinalScores(state, message.channel);

    return message.channel.send(
      `🎉 **FIM DO JOGO!** O placar final foi exibido acima.`
    );
  }

  // 2. Sorteio da Letra
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split("")
    .filter((l) => !["K", "W", "Y"].includes(l));

  const randomLetter = letters[Math.floor(Math.random() * letters.length)];

  // 3. Inicia o Estado da Rodada
  state.isActive = true;
  state.currentLetter = randomLetter;
  state.startTime = Date.now();
  state.players = {};
  state.reviewMessageId = null;

  // 4. Define o Timer
  const gameDuration = state.duration;

  const startEmbed = new EmbedBuilder()
    .setTitle(`🛑 STOP! RODADA ${state.currentRound} de ${state.maxRounds}!`)
    .setDescription(
      `A letra sorteada é: **${randomLetter}**!\n\nVocê tem **${gameDuration} segundos** para responder às categorias:\n**${state.categories.join(
        "**, **"
      )}**\n\n**Como Jogar:** Basta enviar suas respostas separadas por vírgula (ex: \`Bala, Berlim, Banana, Bruno\`). O bot vai deletar a mensagem.`
    )
    .setColor(0x00ff00)
    .setFooter({
      text: `Digite ${PREFIX}parar para encerrar a rodada antes do tempo.`,
    });

  await message.channel.send({ embeds: [startEmbed] });

  // 5. Inicia o Timer e Programa o Fim da Rodada
  state.timer = setTimeout(async () => {
    if (state.isActive) {
      state.isActive = false;
      await message.channel.send(
        `⏰ **TEMPO ESGOTADO!** A rodada da letra **${randomLetter}** foi encerrada. Iniciando fase de revisão...`
      );

      await postReviewEmbed(state, message.channel);
    }
  }, gameDuration * 1000);
}

module.exports = { startRound };
