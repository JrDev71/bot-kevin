const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { addMemberToTimeout, isMemberTimeouted } = require("../utils/timeout");
const { Roles, ArrayRolesID } = require("../other/avatar.json");

module.exports = {
  name: "avatar",
  aliases: ["av"],

  async execute(client, message, args) {
    try {
      // --- Verificação de permissão ---
      const memberHasPermission =
        message.member.roles.cache.some((role) =>
          ArrayRolesID.includes(role.id)
        ) ||
        message.member.permissions.has(PermissionsBitField.Flags.Administrator);

      if (!memberHasPermission) {
        console.log(
          `[AVATAR] ❌ ${message.author.tag} tentou usar o comando sem permissão.`
        );
        return;
      }

      // --- Verifica se o membro está em timeout ---
      if (isMemberTimeouted(message.member)) {
        console.log(`[AVATAR] ⏳ ${message.author.tag} ainda em cooldown.`);
        return;
      }

      // --- Identifica o usuário alvo ---
      const user =
        message.mentions.users.first() ||
        client.users.cache.get(args[0]) ||
        message.author;

      const member = await message.guild.members.fetch(user.id);

      // --- Monta lista de roles configuradas ---
      const rolesObject = Object.keys(Roles).map((key) => ({
        id: Roles[key].id,
        emoji: Roles[key].image,
      }));

      const rolesID = rolesObject.map((r) => r.id).filter((id) => !!id);

      const filteredMemberRoles = member.roles.cache
        .filter((r) => rolesID.includes(r.id))
        .sort((a, b) => b.rawPosition - a.rawPosition);

      const avatarColor = filteredMemberRoles.first()?.hexColor ?? "#2F3136";
      const avatarEmoji =
        rolesObject.find((r) => r.id === filteredMemberRoles.first()?.id)
          ?.emoji ??
        "https://cdn.discordapp.com/attachments/830464371641679873/851493225373237268/3kmx0L9.png";

      // --- Cria o Embed atualizado ---
      const avatarEmbed = new EmbedBuilder()
        .setAuthor({
          name: user.username,
          iconURL: avatarEmoji,
        })
        .setImage(user.displayAvatarURL({ size: 2048, extension: "png" }))
        .setColor(avatarColor)
        .setFooter({ text: `Pedido por ${message.author.tag}` })
        .setTimestamp();

      await message.channel.send({ embeds: [avatarEmbed] });

      // --- Adiciona cooldown se não for admin ---
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        addMemberToTimeout(message.member, 90000);
      }

      console.log(`[AVATAR] ✅ Avatar enviado para ${user.tag}`);
    } catch (error) {
      console.error("[AVATAR] ❌ Erro ao executar o comando:", error);
      message.channel
        .send({
          content:
            "❌ Ocorreu um erro ao tentar buscar o avatar. Verifique se o usuário existe.",
        })
        .catch(() => {});
    }
  },
};
