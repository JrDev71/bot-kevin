// commands/protection.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const {
  addToPanela,
  removeFromPanela,
  isPanela,
  addToBlacklist,
  removeFromBlacklist,
  isBlacklisted,
  getList,
} = require("../protectionManager");

const PREFIX = "k!";

const createEmbed = (title, desc, color = 0x00ff00) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setTimestamp();
};

module.exports = {
  handleProtection: async (message, command, args) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send({
        embeds: [
          createEmbed(
            "🔒 Sem Permissão",
            "Apenas Administradores podem gerenciar a Proteção.",
            0xff0000
          ),
        ],
      });
    }

    const action = args[0]?.toLowerCase();
    const targetId = args[1]?.replace(/<@!?(\d+)>/, "$1");

    // --- COMANDO PANELA ---
    if (command === "panela") {
      if (action === "list") {
        const list = getList("panela");
        const description = list.length
          ? list.map((id) => `<@${id}> (${id})`).join("\n")
          : "Ninguém na panela.";
        return message.channel.send({
          embeds: [
            createEmbed(
              "🛡️ Membros da Panela (Anti-ban)",
              description,
              0x3498db
            ),
          ],
        });
      }

      if (!targetId)
        return message.channel.send(
          `Uso: \`${PREFIX}panela add/rem <id/menção>\` ou \`${PREFIX}panela list\``
        );

      if (action === "add") {
        if (addToPanela(targetId))
          return message.channel.send({
            embeds: [
              createEmbed(
                "🛡️ Adicionado",
                `<@${targetId}> agora está na **Panela** e não pode ser banido pelo bot.`
              ),
            ],
          });
        return message.channel.send("Este usuário já está na panela.");
      }
      if (action === "rem") {
        if (removeFromPanela(targetId))
          return message.channel.send({
            embeds: [
              createEmbed(
                "🛡️ Removido",
                `<@${targetId}> foi removido da Panela.`,
                0xe74c3c
              ),
            ],
          });
        return message.channel.send("Este usuário não estava na panela.");
      }
    }

    // --- COMANDO BLACKLIST ---
    if (command === "blacklist") {
      if (action === "list") {
        const list = getList("blacklist");
        const description = list.length
          ? list.map((id) => `\`${id}\``).join("\n")
          : "Ninguém na blacklist.";
        return message.channel.send({
          embeds: [createEmbed("💀 Blacklist", description, 0x000000)],
        });
      }

      if (!targetId)
        return message.channel.send(
          `Uso: \`${PREFIX}blacklist add/rem <id>\` ou \`${PREFIX}blacklist list\``
        );

      if (action === "add") {
        const member = await message.guild.members
          .fetch(targetId)
          .catch(() => null);
        if (member) {
          if (!member.bannable)
            return message.channel.send(
              "❌ Não consigo banir este usuário agora (cargo alto), mas adicionei à lista."
            );
          await member.ban({
            reason: `Blacklist adicionada por ${message.author.tag}`,
          });
        }

        if (addToBlacklist(targetId))
          return message.channel.send({
            embeds: [
              createEmbed(
                "💀 Blacklist",
                `O ID \`${targetId}\` foi adicionado à Blacklist e será banido se entrar.`
              ),
            ],
          });
        return message.channel.send("Este ID já está na blacklist.");
      }
      if (action === "rem") {
        if (removeFromBlacklist(targetId)) {
          try {
            await message.guild.members.unban(targetId);
          } catch (e) {}
          return message.channel.send({
            embeds: [
              createEmbed(
                "💀 Blacklist",
                `O ID \`${targetId}\` foi removido da Blacklist.`,
                0xe74c3c
              ),
            ],
          });
        }
        return message.channel.send("Este ID não estava na blacklist.");
      }
    }
  },
};
