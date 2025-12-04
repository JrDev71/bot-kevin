// commands/gambling.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getAccount, removeMoney, addMoney } = require("../economyManager");

const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_CASINO = 0xf1c40f; // Dourado
const CURRENCY = "Kevins";

// Cache para o jogo Mines (Armazena o estado do jogo)
// Map<UserId, { bet, bombs, board: [], revealed: [] }>
const minesCache = new Map();

module.exports = {
  minesCache, // Exporta para o handler usar

  handleGambling: async (message, command, args) => {
    const userId = message.author.id;
    const guildId = message.guild.id;

    // --- 🎰 SLOTS (Caça-Níquel) ---
    if (command === "slot" || command === "slots") {
      const bet = parseInt(args[0]);
      if (!bet || bet <= 0)
        return message.reply(
          `<:Nao:1443642030637977743> Uso: \`k!slot <valor>\``
        );

      const acc = await getAccount(userId, guildId);
      if (acc.wallet < bet)
        return message.reply(
          "<:notasemoji:1446229027416309841> Você não tem dinheiro suficiente na carteira."
        );

      // Deduz a aposta
      await removeMoney(userId, guildId, bet);

      // Lógica do Slot
      const fruits = [
        "<:emojiacerola:1446235024490889317>",
        "<:emojimangaba:1446235482131271913>",
        "<:uvaemoji:1446236337350115440>",
        "<:arogh_white_glock:1439459921484714004>",
        "<:vd_diamanteK:1443648289068285972>",
        "<:white_setecr:1446236775663014086>",
      ];
      const reel1 = fruits[Math.floor(Math.random() * fruits.length)];
      const reel2 = fruits[Math.floor(Math.random() * fruits.length)];
      const reel3 = fruits[Math.floor(Math.random() * fruits.length)];

      let multiplier = 0;
      let resultText = "Você perdeu!";
      let color = 0xff0000;

      // Regras de Vitória
      if (reel1 === reel2 && reel2 === reel3) {
        multiplier = 5; // Jackpot (3 iguais)
        resultText = "JACKPOT! (5x)";
        color = 0x00ff00;
        if (reel1 === "<:vd_diamanteK:1443648289068285972>") multiplier = 10; // Super Jackpot
        if (reel1 === "<:white_setecr:1446236775663014086>") multiplier = 20; // Mega Jackpot
      } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        multiplier = 1.5; // 2 iguais
        resultText = "Belo par! (1.5x)";
        color = 0xf1c40f;
      }

      const prize = Math.floor(bet * multiplier);
      if (prize > 0) await addMoney(userId, guildId, prize);

      const embed = new EmbedBuilder()
        .setTitle("<:emoji777:1446238437869879319> Cassino do Kevin")
        .setDescription(
          `**Aposta:** ${bet} ${CURRENCY}\n\n> | ${reel1} | ${reel2} | ${reel3} |\n\n**${resultText}**\nGanho: **${prize}** ${CURRENCY}`
        )
        .setColor(color)
        .setImage(HEADER_IMAGE)
        .setFooter({ text: `Saldo atual: ${acc.wallet - bet + prize}` });

      return message.channel.send({ embeds: [embed] });
    }

    // --- 💣 MINES (Campo Minado) ---
    if (command === "mines") {
      const bet = parseInt(args[0]);
      const bombs = parseInt(args[1]) || 3; // Padrão 3 bombas

      if (!bet || bet <= 0)
        return message.reply(
          `<:Nao:1443642030637977743> Uso: \`k!mines <valor> [bombas 1-24]\``
        );
      if (bombs < 1 || bombs > 24)
        return message.reply(
          "<:Nao:1443642030637977743> O número de bombas deve ser entre 1 e 24."
        );
      if (minesCache.has(userId))
        return message.reply(
          "<:Nao:1443642030637977743> Você já tem um jogo em andamento! Termine ele antes."
        );

      const acc = await getAccount(userId, guildId);
      if (acc.wallet < bet)
        return message.reply("<:notasemoji:1446229027416309841> Sem saldo.");

      // Deduz a aposta na hora (para evitar sair do jogo e não perder)
      await removeMoney(userId, guildId, bet);

      // Cria o tabuleiro (0 = diamante, 1 = bomba)
      // Grid 5x5 = 25 posições
      let board = Array(25).fill(0);
      let bombsPlaced = 0;
      while (bombsPlaced < bombs) {
        const pos = Math.floor(Math.random() * 25);
        if (board[pos] === 0) {
          board[pos] = 1;
          bombsPlaced++;
        }
      }

      // Salva estado
      minesCache.set(userId, {
        bet,
        bombsCount: bombs,
        board,
        revealed: [],
        multiplier: 1.0,
        active: true,
      });

      // Gera botões (5 linhas de 5 botões)
      const rows = [];
      for (let i = 0; i < 5; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 5; j++) {
          const index = i * 5 + j;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`mines_${index}`)
              .setLabel("❓")
              .setStyle(ButtonStyle.Secondary)
          );
        }
        rows.push(row);
      }
      // Botão de Cashout
      const cashoutRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("mines_cashout")
          .setLabel(
            "<:sacodenotaemoji:1446230070552432771> SAIR E PEGAR O DINHEIRO"
          )
          .setStyle(ButtonStyle.Success)
      );
      rows.push(cashoutRow);

      const embed = new EmbedBuilder()
        .setTitle("<:black_bombcr:1446238680741314643> Mines")
        .setDescription(
          `Aposta: **${bet}**\nBombas: **${bombs}**\nMultiplicador: **1.00x**\nLucro: **0**`
        )
        .setColor(COLOR_CASINO)
        .setImage(HEADER_IMAGE);

      await message.channel.send({ embeds: [embed], components: rows });
    }
  },
};
