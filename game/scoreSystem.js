// game/scoreSystem.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// IDs Exportáveis para Botões e Modals
const FINALIZE_BUTTON_ID = "finalize_stop_scoring";
const EDIT_BUTTON_ID = "edit_review_answers";
const INVALIDATE_MODAL_ID = "invalidate_modal";
const PLAYER_INPUT_ID = "player_to_invalidate";
const CATEGORY_INPUT_ID = "category_to_invalidate";

/**
 * Função principal: Calcula a pontuação final de uma rodada, acumula e envia o resultado.
 */
async function calculateScores(state, channel) {
  if (Object.keys(state.players).length === 0) {
    return channel.send(
      "Ninguém respondeu a tempo! Rodada encerrada sem pontuação."
    );
  }

  const categories = state.categories;
  const allAnswers = {}; // [1, 2: Lógica de Contagem]

  for (const playerID in state.players) {
    state.players[playerID].score = 0;
    state.players[playerID].unique = new Array(categories.length).fill(true);
  }

  categories.forEach((category, catIndex) => {
    allAnswers[category] = {};
    for (const playerID in state.players) {
      const answer = state.players[playerID].answers[catIndex];
      if (answer && answer !== "") {
        allAnswers[category][answer] = (allAnswers[category][answer] || 0) + 1;
      }
    }
  }); // 3. Atribuição de Pontos e Acúmulo Total

  for (const playerID in state.players) {
    const player = state.players[playerID];
    let totalRoundScore = 0;

    player.answers.forEach((answer, catIndex) => {
      if (!answer || answer === "") return;

      const categoryName = categories[catIndex];
      const usageCount = allAnswers[categoryName][answer];

      let points = 0;

      if (usageCount === 1) {
        points = 20; // ÚNICA
      } else if (usageCount > 1) {
        points = 10; // REPETIDA
        player.unique[catIndex] = false;
      }

      totalRoundScore += points;
    });

    player.score = totalRoundScore;
    // ACUMULA A PONTUAÇÃO GERAL
    state.totalScores[playerID] =
      (state.totalScores[playerID] || 0) + totalRoundScore;
  } // 4. Criação do Embed de Resultados FINAIS (após revisão)

  const playersForRanking = Object.keys(state.players).map((playerID) => ({
    id: playerID,
    roundScore: state.players[playerID].score,
    totalScore: state.totalScores[playerID],
    answers: state.players[playerID].answers,
    unique: state.players[playerID].unique,
  }));

  const sortedPlayers = playersForRanking.sort(
    (a, b) => b.totalScore - a.totalScore
  );

  const fields = sortedPlayers.map((data, index) => {
    const member = channel.guild.members.cache.get(data.id) || {
      user: { tag: "Jogador Desconhecido" },
    };

    const formattedAnswers = data.answers
      .map((ans, catIndex) => {
        if (!ans || ans === "") {
          return "❌ --- (0 pts)";
        }
        const symbol = data.unique[catIndex] ? "⭐" : "🔄";
        const pts = data.unique[catIndex] ? 20 : 10;
        return `${symbol} ${ans} (${pts} pts)`;
      })
      .join("\n");

    return {
      name: `${index + 1}. ${member.user.tag} | RODADA: ${
        data.roundScore
      } | TOTAL: ${data.totalScore}`,
      value: formattedAnswers,
      inline: false,
    };
  });

  const resultEmbed = new EmbedBuilder()
    .setTitle(`🏆 RESULTADO OFICIAL DA RODADA ${state.currentRound}`)
    .setDescription(
      `Pontuação validada. Início da Próxima Rodada em 10 segundos!`
    )
    .setFields(fields)
    .setColor(0x00ffd7)
    .setFooter({
      text: "⭐ Único (20 pts) | 🔄 Repetido (10 pts) | ❌ Invalidado/Vazio (0 pts)",
    })
    .setTimestamp();

  await channel.send({ embeds: [resultEmbed] });
}

/**
 * Função para postar todas as respostas para revisão manual.
 */
async function postReviewEmbed(state, channel) {
  const categories = state.categories;
  const fields = [];

  // Lista todas as respostas de todos os jogadores para revisão
  categories.forEach((category, catIndex) => {
    let answerList = "";
    for (const playerID in state.players) {
      const member = channel.guild.members.cache.get(playerID) || {
        user: { tag: "Jogador Desconhecido" },
      };
      // Se a resposta estiver vazia (foi invalidada), mostra como "❌ INVALIDADO"
      const answer =
        state.players[playerID].answers[catIndex] || "❌ INVALIDADO";
      answerList += `**${member.user.tag}:** ${answer}\n`;
    }

    fields.push({
      name: `📝 Categoria: ${category}`,
      value: answerList,
      inline: true,
    });
  });

  const reviewEmbed = new EmbedBuilder()
    .setTitle(`👁️ REVISÃO MANUAL - LETRA ${state.currentLetter}`)
    .setDescription(
      `Todas as respostas da rodada foram listadas abaixo. **Staff:** Use o botão de correção para invalidar palavras erradas/não existentes.\n\n` +
        `Após a revisão, **clique em FINALIZAR PONTUAÇÃO** para somar os pontos e começar a próxima rodada.`
    )
    .setFields(fields)
    .setColor(0xffa500) // Laranja (Alerta)
    .setTimestamp();

  // Botões de Finalização e Correção (NOVA actionRow)
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(EDIT_BUTTON_ID)
      .setLabel("✏️ CORRIGIR / INVALIDAR RESPOSTA")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(FINALIZE_BUTTON_ID)
      .setLabel("✅ FINALIZAR PONTUAÇÃO")
      .setStyle(ButtonStyle.Success)
  );

  // Tentamos editar a mensagem de revisão se ela já existir
  if (state.reviewMessageId) {
    try {
      const oldMessage = await channel.messages.fetch(state.reviewMessageId);
      await oldMessage.edit({
        embeds: [reviewEmbed],
        components: [actionRow],
        content: " ",
      });
      return;
    } catch (e) {
      console.error("Erro ao editar a mensagem de revisão:", e);
    }
  }

  // Se não existir, envia uma nova
  const sentMessage = await channel.send({
    embeds: [reviewEmbed],
    components: [actionRow],
  });
  state.reviewMessageId = sentMessage.id; // Salva o ID da nova mensagem de revisão
}

/**
 * Função para exibir o placar final (fim de jogo). (Mantida)
 */
async function displayFinalScores(state, channel) {
  const sortedFinalPlayers = Object.entries(state.totalScores).sort(
    ([, a], [, b]) => b - a
  );

  if (sortedFinalPlayers.length === 0) {
    return channel.send("O jogo terminou, mas ninguém pontuou.");
  }

  const fields = sortedFinalPlayers.map(([playerID, score], index) => {
    const member = channel.guild.members.cache.get(playerID) || {
      user: { tag: "Jogador Desconhecido" },
    };
    return {
      name: `${index + 1}. ${member.user.tag}`,
      value: `Total Acumulado: **${score} Pontos**`,
      inline: false,
    };
  });

  const finalEmbed = new EmbedBuilder()
    .setTitle(`🏆 PLACAR FINAL DO JOGO STOP (${state.maxRounds} RODADAS)`)
    .setDescription(
      "Parabéns aos vencedores! O jogo foi encerrado e o placar total está zerado para o próximo jogo."
    )
    .setFields(fields)
    .setColor(0x00ffd7)
    .setTimestamp();

  await channel.send({ embeds: [finalEmbed] });

  state.totalScores = {};
}

module.exports = {
  calculateScores,
  displayFinalScores,
  postReviewEmbed,
  FINALIZE_BUTTON_ID,
  EDIT_BUTTON_ID,
  INVALIDATE_MODAL_ID,
  PLAYER_INPUT_ID,
  CATEGORY_INPUT_ID,
};
