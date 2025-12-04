// commands/crime.js
const { EmbedBuilder } = require("discord.js");
// Importação corrigida com buyItem
const {
  getAccount,
  addMoney,
  removeMoney,
  hasItem,
  buyItem,
} = require("../economyManager");

// CONFIG VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

// Configuração dos Itens (Preços e IDs)
const SHOP_ITEMS = {
  gun: {
    name: "<:arogh_white_glock:1439459921484714004> Oitão",
    price: 5000,
    desc: "+20% chance de roubo",
  },
  vest: {
    name: "<:coleteemoji:1446249525168701580> Colete",
    price: 5000,
    desc: "-20% chance de ser roubado",
  },
  lock: {
    name: "🔐 Cadeado",
    price: 2000,
    desc: "Protege contra roubo 1 vez (quebra)",
  },
};

// Configuração de Risco
const JAIL_TIME_MS = 5 * 60 * 1000; // 5 Minutos de prisão se falhar

// Helper para Embeds Rápidos
const createResponseEmbed = (
  title,
  description,
  color = COLOR_NEUTRAL,
  image = null
) => {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
  if (image) embed.setImage(image);
  return embed;
};

module.exports = {
  SHOP_ITEMS,

  handleCrime: async (message, command, args) => {
    const userId = message.author.id;
    const guildId = message.guild.id;

    // --- k!loja (Ver itens) ---
    if (command === "loja") {
      const embed = new EmbedBuilder()
        .setTitle("<:lojaemoji:1446250117337452544> Loja do Gueto")
        .setDescription("Compre itens para melhorar seus corres.")
        .setColor(0x00ff00)
        .setImage(HEADER_IMAGE); // Banner adicionado

      for (const [id, item] of Object.entries(SHOP_ITEMS)) {
        embed.addFields({
          name: `${item.name} — ${item.price} Kevins`,
          value: item.desc,
        });
      }
      return message.channel.send({ embeds: [embed] });
    }

    // --- k!comprar <item> ---
    if (command === "comprar") {
      const itemId = args[0]?.toLowerCase();
      const itemEntry = Object.entries(SHOP_ITEMS).find(
        ([key, val]) =>
          key === itemId || val.name.toLowerCase().includes(itemId)
      );

      if (!itemEntry) {
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              "<:Nao:1443642030637977743> Item não encontrado. Veja a `k!loja`.",
              0xff0000
            ),
          ],
        });
      }

      const [key, item] = itemEntry;

      // Chama buyItem do economyManager
      const res = await buyItem(userId, guildId, item.price, key);

      if (res.success) {
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              `✅ Você comprou **${item.name}**!`,
              0x00ff00
            ),
          ],
        });
      }
      return message.channel.send({
        embeds: [
          createResponseEmbed(
            null,
            `<:Nao:1443642030637977743> ${res.msg}`,
            0xff0000
          ),
        ],
      });
    }

    // --- k!roubar @user (O DIFERENCIAL) ---
    if (command === "roubar" || command === "rob") {
      const target = message.mentions.users.first();

      if (!target)
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              "<:Nao:1443642030637977743> Mencione a vítima."
            ),
          ],
        });
      if (target.id === userId)
        return message.channel.send({
          embeds: [createResponseEmbed(null, "Vai se roubar?")],
        });
      if (target.bot)
        return message.channel.send({
          embeds: [createResponseEmbed(null, "Não pode roubar robôs.")],
        });

      const attackerAcc = await getAccount(userId, guildId);
      const victimAcc = await getAccount(target.id, guildId);

      if (victimAcc.wallet < 100) {
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              "<:Nao:1443642030637977743> Essa pessoa está DURA, nem vale a pena."
            ),
          ],
        });
      }

      // Verifica Inventários
      const hasGun = await hasItem(userId, guildId, "gun");
      const hasVest = await hasItem(target.id, guildId, "vest");
      // const hasLock = await hasItem(target.id, guildId, "lock"); // Lógica futura

      // Cálculo da Chance (Base 40%)
      let chance = 40;
      if (hasGun) chance += 20;
      if (hasVest) chance -= 20;

      const roll = Math.floor(Math.random() * 100) + 1;

      // SUCESSO
      if (roll <= chance) {
        // Rouba entre 10% e 40% da carteira da vítima
        const percent = Math.random() * (0.4 - 0.1) + 0.1;
        const amount = Math.floor(victimAcc.wallet * percent);

        await removeMoney(target.id, guildId, amount);
        await addMoney(userId, guildId, amount);

        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                "<:arogh_white_glock:1439459921484714004> Assalto Bem Sucedido!"
              )
              .setDescription(
                `**${message.author.username}** enquadrou **${target.username}** e levou **${amount} Kevins**!`
              )
              .setColor(0x00ff00)
              .setImage(HEADER_IMAGE)
              .setFooter({ text: `Chance: ${chance}% | Dado: ${roll}` }),
          ],
        });
      }

      // FRACASSO (PRISÃO AUTOMÁTICA)
      else {
        // Aplica Timeout no Discord (A Punição Real)
        const member = message.member;
        if (member.moderatable) {
          await member.timeout(
            JAIL_TIME_MS,
            "Preso em flagrante tentando roubar."
          );
        }

        // Multa
        const fine = 500;
        await removeMoney(userId, guildId, fine);

        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🚔 POLÍCIA CHEGOU!")
              .setDescription(
                `**${message.author.username}** tentou roubar, falhou e foi preso!\n\n**Pena:** 5 Minutos de Timeout + Multa de ${fine} Kevins.`
              )
              .setColor(0xff0000)
              .setImage(
                "https://i.pinimg.com/originals/ea/0c/cd/ea0ccd11f06cba1bfe842f1c47e7242d.gif"
              ) // Gif de sirene
              .setFooter({ text: `Chance: ${chance}% | Dado: ${roll}` }),
          ],
        });
      }
    }
  },
};
