// handlers/gamblingHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { minesCache } = require("../commands/gambling"); // Importa o cache de jogos
const { addMoney } = require("../economyManager");

const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";

module.exports = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("mines_")) return false;

  const userId = interaction.user.id;
  const game = minesCache.get(userId);

  // Verifica se o usuário tem um jogo e se é o jogo DELE
  if (!game) {
    // Se o jogo não existe mais mas o botão está lá, apenas responde erro
    return interaction.reply({
      content: "Este jogo já expirou ou não é seu.",
      ephemeral: true,
    });
  }

  // CASHOUT (Sacar)
  if (interaction.customId === "mines_cashout") {
    if (game.revealed.length === 0) {
      return interaction.reply({
        content: "Você precisa abrir pelo menos um campo!",
        ephemeral: true,
      });
    }

    const winAmount = Math.floor(game.bet * game.multiplier);
    await addMoney(userId, interaction.guild.id, winAmount);

    minesCache.delete(userId); // Limpa o jogo

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle("<:sacodenotaemoji:1446230070552432771> CASHOUT!")
      .setColor(0x00ff00)
      .setDescription(
        `Você parou e ganhou **${winAmount} Kevins**! (x${game.multiplier.toFixed(
          2
        )})`
      );

    // Desativa botões e revela tudo
    const newRows = revealBoard(game.board, game.revealed, true);
    return interaction.update({ embeds: [embed], components: newRows });
  }

  // JOGADA (Clicou num quadrado)
  const index = parseInt(interaction.customId.split("_")[1]);
  if (game.revealed.includes(index)) return interaction.deferUpdate(); // Já clicado

  // 1. BATEU NA BOMBA (PERDEU)
  if (game.board[index] === 1) {
    minesCache.delete(userId);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle("💥 CABUM!")
      .setColor(0xff0000)
      .setDescription(
        `Você explodiu uma bomba e perdeu **${game.bet} Kevins**.`
      );

    // Revela tudo com a bomba explodida
    const newRows = revealBoard(game.board, game.revealed, true, index);
    return interaction.update({ embeds: [embed], components: newRows });
  }

  // 2. BATEU NO DIAMANTE (CONTINUA)
  game.revealed.push(index);

  // Calcula novo multiplicador (Lógica simples de risco)
  // Cada acerto aumenta o multi baseado na chance
  const totalTiles = 25;
  const safeTiles = totalTiles - game.bombsCount;
  const remainingSafe = safeTiles - (game.revealed.length - 1);
  // Fórmula de crescimento exponencial leve
  const nextMulti =
    game.multiplier * (1 + (game.bombsCount / remainingSafe) * 0.8);
  game.multiplier = nextMulti;

  const currentWin = Math.floor(game.bet * game.multiplier);

  // Se abriu todos os diamantes possíveis -> Auto Win
  if (game.revealed.length === safeTiles) {
    await addMoney(userId, interaction.guild.id, currentWin);
    minesCache.delete(userId);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle("<:vd_diamanteK:1443648289068285972> VITÓRIA PERFEITA!")
      .setColor(0x00ff00)
      .setDescription(
        `Você achou todos os diamantes!\nGanho: **${currentWin} Kevins**`
      );

    const newRows = revealBoard(game.board, game.revealed, true);
    return interaction.update({ embeds: [embed], components: newRows });
  }

  // Atualiza o jogo
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setDescription(
      `Aposta: **${game.bet}**\nBombas: **${
        game.bombsCount
      }**\nMultiplicador: **${game.multiplier.toFixed(
        2
      )}x**\nLucro Atual: **${currentWin}**`
    )
    .setColor(0xf1c40f);

  const newRows = revealBoard(game.board, game.revealed, false);
  await interaction.update({ embeds: [embed], components: newRows });
};

// Função para redesenhar os botões
function revealBoard(board, revealed, gameOver, explodedIndex = -1) {
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 5; j++) {
      const index = i * 5 + j;
      const btn = new ButtonBuilder()
        .setCustomId(`mines_${index}`)
        .setStyle(ButtonStyle.Secondary);

      if (revealed.includes(index)) {
        btn
          .setEmoji("<:vd_diamanteK:1443648289068285972>")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);
      } else if (gameOver) {
        // Revela o resto
        btn.setDisabled(true);
        if (board[index] === 1) {
          btn.setEmoji("<:black_bombcr:1446238680741314643>");
          if (index === explodedIndex) btn.setStyle(ButtonStyle.Danger); // A bomba que você clicou
        } else {
          btn.setEmoji("☁️"); // Espaço vazio não clicado
        }
      } else {
        btn.setLabel("❓");
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }

  // Se não acabou, adiciona botão de cashout
  if (!gameOver) {
    const cashoutRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mines_cashout")
        .setLabel(
          "<:sacodenotaemoji:1446230070552432771> SAIR E PEGAR O DINHEIRO"
        )
        .setStyle(ButtonStyle.Success)
    );
    rows.push(cashoutRow);
  }

  return rows;
}
