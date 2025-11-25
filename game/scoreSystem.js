// game/scoreSystem.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const FINALIZE_BUTTON_ID = "finalize_stop_scoring";
const EDIT_BUTTON_ID = "edit_review_answers";
const INVALIDATE_MODAL_ID = "invalidate_modal";
const PLAYER_INPUT_ID = "player_to_invalidate";
const CATEGORY_INPUT_ID = "category_to_invalidate";

// --- CONFIGURAÇÃO VISUAL ---
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/1323511636518371360/1323511704248258560/S2_banner_1.png?ex=6775761a&is=6774249a&hm=52d8e058752746d0f07363140799265a78070602456c93537c7d1135c7203d1a&";
const COLOR_NEUTRAL = 0x2f3136;

// Função auxiliar de Embed
const createGameEmbed = (title, description) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(COLOR_NEUTRAL)
    .setImage(HEADER_IMAGE)
    .setTimestamp();
};

async function calculateScores(state, channel) {
  if (Object.keys(state.players).length === 0) {
    return channel.send({
      embeds: [createGameEmbed("Fim da Rodada", "Ninguém respondeu a tempo!")],
    });
  }
  // ... (Lógica de cálculo de pontos mantida idêntica) ...
  const categories = state.categories;
  const allAnswers = {};
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
  });
  for (const playerID in state.players) {
    const player = state.players[playerID];
    let totalRoundScore = 0;
    player.answers.forEach((answer, catIndex) => {
      if (!answer || answer === "") return;
      const categoryName = categories[catIndex];
      const usageCount = allAnswers[categoryName][answer];
      let points = 0;
      if (usageCount === 1) {
        points = 20;
      } else if (usageCount > 1) {
        points = 10;
        player.unique[catIndex] = false;
      }
      totalRoundScore += points;
    });
    player.score = totalRoundScore;
    state.totalScores[playerID] =
      (state.totalScores[playerID] || 0) + totalRoundScore;
  }
  // ... (Fim da lógica de cálculo) ...

  // --- EMBED DE RESULTADO PROFISSIONAL ---
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
      user: { tag: "Desconhecido" },
    };
    const formattedAnswers = data.answers
      .map((ans, catIndex) => {
        if (!ans || ans === "") return "❌ `---`";
        const symbol = data.unique[catIndex] ? "⭐" : "🔄";
        return `${symbol} ${ans}`;
      })
      .join("\n");
    return {
      name: `#${index + 1} ${member.user.tag}`,
      value: `**Rodada:** ${data.roundScore} | **Total:** ${data.totalScore}\n${formattedAnswers}`,
      inline: true,
    };
  });

  const resultEmbed = createGameEmbed(
    `🏆 Resultado: Rodada ${state.currentRound}`,
    `Próxima rodada em instantes...`
  )
    .setFields(fields)
    .setFooter({ text: "⭐ 20 pts | 🔄 10 pts | ❌ 0 pts" });

  await channel.send({ embeds: [resultEmbed] });
}

async function postReviewEmbed(state, channel) {
  const categories = state.categories;
  const fields = [];

  categories.forEach((category, catIndex) => {
    let answerList = "";
    for (const playerID in state.players) {
      const member = channel.guild.members.cache.get(playerID) || {
        user: { tag: "..." },
      };
      const answer = state.players[playerID].answers[catIndex] || "❌";
      answerList += `**${member.user.username}:** ${answer}\n`;
    }
    fields.push({
      name: category,
      value: answerList || "Sem respostas",
      inline: true,
    });
  });

  const reviewEmbed = createGameEmbed(
    `👁️ Revisão: Letra ${state.currentLetter}`,
    "Analise as respostas abaixo. Se houver algo inválido, use o botão de **Corrigir**.\nQuando estiver pronto, clique em **Finalizar**."
  );
  reviewEmbed.setFields(fields);

  // --- BOTÕES CINZA/SECONDARY (CLEAN) ---
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(EDIT_BUTTON_ID)
      .setLabel("Corrigir / Invalidar")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("✏️"),
    new ButtonBuilder()
      .setCustomId(FINALIZE_BUTTON_ID)
      .setLabel("Confirmar Pontuação")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("✅")
  );

  if (state.reviewMessageId) {
    try {
      const oldMessage = await channel.messages.fetch(state.reviewMessageId);
      await oldMessage.edit({
        embeds: [reviewEmbed],
        components: [actionRow],
        content: "",
      });
      return;
    } catch (e) {}
  }

  const sentMessage = await channel.send({
    embeds: [reviewEmbed],
    components: [actionRow],
  });
  state.reviewMessageId = sentMessage.id;
}

async function displayFinalScores(state, channel) {
  const sortedFinalPlayers = Object.entries(state.totalScores).sort(
    ([, a], [, b]) => b - a
  );

  if (sortedFinalPlayers.length === 0)
    return channel.send("Jogo encerrado sem pontuação.");

  const fields = sortedFinalPlayers.map(([playerID, score], index) => {
    const member = channel.guild.members.cache.get(playerID) || {
      user: { tag: "Unknown" },
    };
    const medal =
      index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
    return {
      name: `${medal} ${index + 1}º Lugar`,
      value: `**${member.user.tag}**\nPontuação Final: **${score}**`,
      inline: false,
    };
  });

  const finalEmbed = createGameEmbed(
    `🏆 Placar Final`,
    `O jogo de ${state.maxRounds} rodadas chegou ao fim!`
  ).setFields(fields);

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
