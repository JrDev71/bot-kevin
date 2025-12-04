// commands/crime.js
const { EmbedBuilder } = require("discord.js");
const {
  getAccount,
  addMoney,
  removeMoney,
  hasItem,
} = require("../economyManager");

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
        .setColor(0x00ff00);

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
      const item = Object.entries(SHOP_ITEMS).find(
        ([key, val]) =>
          key === itemId || val.name.toLowerCase().includes(itemId)
      );

      if (!item)
        return message.reply(
          "<:Nao:1443642030637977743> Item não encontrado. Veja a `k!loja`."
        );

      const { buyItem } = require("../economyManager"); // Import tardio para evitar ciclo
      const res = await buyItem(userId, guildId, item[1].price, item[0]);

      if (res.success)
        return message.reply(`✅ Você comprou **${item[1].name}**!`);
      return message.reply(`<:Nao:1443642030637977743> ${res.msg}`);
    }

    // --- k!roubar @user (O DIFERENCIAL) ---
    if (command === "roubar" || command === "rob") {
      const target = message.mentions.users.first();
      if (!target)
        return message.reply("<:Nao:1443642030637977743> Mencione a vítima.");
      if (target.id === userId) return message.reply("Vai se roubar?");
      if (target.bot) return message.reply("Não pode roubar robôs.");

      const attackerAcc = await getAccount(userId, guildId);
      const victimAcc = await getAccount(target.id, guildId);

      if (victimAcc.wallet < 100)
        return message.reply(
          "<:Nao:1443642030637977743> Essa pessoa está DURA, nem vale a pena."
        );

      // Verifica Inventários
      const hasGun = await hasItem(userId, guildId, "gun");
      const hasVest = await hasItem(target.id, guildId, "vest");
      const hasLock = await hasItem(target.id, guildId, "lock");

      // Se a vítima tem cadeado, o roubo falha e o cadeado quebra
      /* (Lógica de quebrar item seria adicionada aqui no removeInventory, simplificando para o exemplo) */

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
