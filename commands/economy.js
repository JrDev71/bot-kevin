// commands/economy.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const {
  getAccount,
  addMoney,
  removeMoney,
  pay,
  claimDaily,
  work,
  getLeaderboard,
} = require("../economyManager");

// CONFIG VISUAL PADRÃO
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;
const CURRENCY = "Kevins"; // Nome da moeda

// Helper de Tempo
const formatTime = (ms) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const createEcoEmbed = (title, desc, color = COLOR_NEUTRAL) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setImage(HEADER_IMAGE)
    .setTimestamp();
};

module.exports = {
  handleEconomy: async (message, command, args) => {
    const userId = message.author.id;
    const guildId = message.guild.id;

    // --- k!atm / k!saldo ---
    if (["atm", "saldo", "carteira"].includes(command)) {
      const target = message.mentions.users.first() || message.author;
      const acc = await getAccount(target.id, guildId);

      const embed = createEcoEmbed(
        `<:contabancariaemoji:1446227422033739876> Conta Bancária`,
        `Titular: ${target}`
      )
        .addFields(
          {
            name: "<:notasemoji:1446229027416309841> Carteira",
            value: `**${acc.wallet}** ${CURRENCY}`,
            inline: true,
          },
          {
            name: "<:bancoemoji:1446226667717787929> Banco",
            value: `**${acc.bank}** ${CURRENCY}`,
            inline: true,
          },
          {
            name: "<:sacodenotaemoji:1446230070552432771> Patrimônio",
            value: `**${acc.wallet + acc.bank}** ${CURRENCY}`,
            inline: false,
          }
        )
        .setThumbnail(target.displayAvatarURL());

      return message.channel.send({ embeds: [embed] });
    }

    // --- k!daily ---
    if (command === "daily") {
      const res = await claimDaily(userId, guildId);
      if (res.success) {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "<:acalendrio_brancovibe:1446230414003011756> Recompensa Diária",
              `Você recebeu **${res.amount} ${CURRENCY}**! Volte amanhã.`,
              0x00ff00
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "<:temporizador:1443649098195402865> Calma lá!",
              `Você já pegou seu daily. Volte em **${formatTime(
                res.remaining
              )}**.`,
              0xe74c3c
            ),
          ],
        });
      }
    }

    // --- k!work ---
    if (["work", "trabalhar"].includes(command)) {
      const res = await work(userId, guildId);
      if (res.success) {
        const jobs = [
          "programador",
          "designer",
          "admin do discord",
          "streamer",
          "vendedor de pack",
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "<:emojitrabalhar:1446231089894129674> Trabalho Duro",
              `Você trabalhou como **${job}** e ganhou **${res.amount} ${CURRENCY}**!`,
              0x00ff00
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "<:temporizador:1443649098195402865> Descanso",
              `Você está cansado. Volte em **${formatTime(res.remaining)}**.`,
              0xe74c3c
            ),
          ],
        });
      }
    }

    // --- k!pay @user <valor> ---
    if (["pay", "pagar"].includes(command)) {
      const target = message.mentions.users.first();
      const amount = parseInt(args[1]);

      if (!target || !amount || amount <= 0)
        return message.reply("Uso: `k!pay @usuario <valor>`");
      if (target.id === userId)
        return message.reply("Não pode pagar a si mesmo.");

      const res = await pay(userId, target.id, guildId, amount);
      if (res.success) {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "<:green_Pix:1446556258235580548> Transferência",
              `Você enviou **${amount} ${CURRENCY}** para ${target}.`,
              0x00ff00
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "<:Nao:1443642030637977743> Erro",
              res.msg,
              0xe74c3c
            ),
          ],
        });
      }
    }

    // --- k!rank / k!leaderboard ---
    if (["rank", "leaderboard", "top"].includes(command)) {
      const list = await getLeaderboard(guildId);
      const topString =
        list
          .map((acc, i) => {
            return `**${i + 1}.** <@${acc.userId}> — ${acc.wallet} ${CURRENCY}`;
          })
          .join("\n") || "Ninguém tem dinheiro ainda.";

      return message.channel.send({
        embeds: [
          createEcoEmbed(
            "<a:ztrofeu_amarelovibe:1446231485416865902> Ranking dos Mais Ricos",
            topString,
            0xf1c40f
          ),
        ],
      });
    }

    // --- ADMIN: k!eco add/rem @user <valor> ---
    if (command === "eco") {
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      )
        return;

      const action = args[0]; // add / rem
      const target = message.mentions.users.first();
      const amount = parseInt(args[2]);

      if (!["add", "rem"].includes(action) || !target || !amount) {
        return message.reply("Uso: `k!eco add/rem @user <valor>`");
      }

      if (action === "add") {
        await addMoney(target.id, guildId, amount);
        return message.channel.send(
          `<:certo_froid:1443643346722754692> Adicionado **${amount}** para ${target}.`
        );
      }
      if (action === "rem") {
        await removeMoney(target.id, guildId, amount);
        return message.channel.send(
          `<:vmc_lixeiraK:1443653159779041362> Removido **${amount}** de ${target}.`
        );
      }
    }
  },
};
