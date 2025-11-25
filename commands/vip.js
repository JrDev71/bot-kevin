// commands/vip.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const {
  addVip,
  removeVip,
  getVipData,
  addFriend,
  removeFriend,
  addVipTime,
  MAX_FRIENDS,
} = require("../vipManager");

const PREFIX = "k!";

// IDs dos Botões
const BTN_TAG = "vip_manage_tag";
const BTN_CHANNEL = "vip_manage_channel";
const BTN_ADD_MEMBER = "vip_add_member_role";

// CONFIG VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/1323511636518371360/1323511704248258560/S2_banner_1.png?ex=6775761a&is=6774249a&hm=52d8e058752746d0f07363140799265a78070602456c93537c7d1135c7203d1a&";
const NEUTRAL_COLOR = 0x2f3136;

module.exports = {
  BTN_TAG,
  BTN_CHANNEL,
  BTN_ADD_MEMBER,

  handleVipCommands: async (message, command, args) => {
    const targetId = args[1]?.replace(/<@!?(\d+)>/, "$1");
    const firstArgTarget = args[0]?.replace(/<@!?(\d+)>/, "$1");
    const subCommand = args[0]?.toLowerCase();

    // --- COMANDO k!vip (PAINEL) ---
    if (command === "vip") {
      const userData = getVipData(message.author.id);

      if (!userData) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("💎 Status VIP")
              .setDescription("Você não possui um plano VIP ativo.")
              .setColor(NEUTRAL_COLOR)
              .setImage(HEADER_IMAGE),
          ],
        });
      }

      const expiresDate = userData.expiresAt
        ? `<t:${Math.floor(userData.expiresAt / 1000)}:R>`
        : "Nunca";

      const embed = new EmbedBuilder()
        .setTitle(`Painel de Controle VIP`)
        .setDescription(`Gerencie seus benefícios exclusivos abaixo.`)
        .setColor(NEUTRAL_COLOR)
        .setImage(HEADER_IMAGE)
        .addFields(
          { name: "⏳ Expira em", value: expiresDate, inline: true },
          {
            name: "🏷️ Tag Exclusiva",
            value: userData.customRoleId
              ? `<@&${userData.customRoleId}>`
              : "❌ Não criada",
            inline: true,
          },
          {
            name: "🔊 Canal Privado",
            value: userData.customChannelId
              ? `<#${userData.customChannelId}>`
              : "❌ Não criado",
            inline: true,
          },
          {
            name: "👥 Amigos",
            value: `**${userData.friends.length}** (Ilimitado)`,
            inline: false,
          }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(BTN_TAG)
          .setLabel("Configurar Tag")
          .setEmoji("🏷️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BTN_CHANNEL)
          .setLabel("Gerenciar Canal")
          .setEmoji("🔊")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BTN_ADD_MEMBER)
          .setLabel("Adicionar Amigo")
          .setEmoji("👥")
          .setStyle(ButtonStyle.Secondary)
      );

      return message.channel.send({ embeds: [embed], components: [row] });
    }

    // --- COMANDOS DE ADMINISTRAÇÃO (Mensagens simples, sem imagem para não poluir) ---
    // (Mantive as respostas de texto simples ou embeds pequenos para comandos rápidos de admin)

    // k!setvip
    if (command === "setvip") {
      // ... (Lógica de permissão mantida) ...
      // Vou simplificar aqui, mas mantenha a lógica de verificação de permissão do arquivo anterior
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      )
        return message.reply("🔒 Apenas Admins.");

      const days = args[1] ? parseInt(args[1]) : 30;
      if (!firstArgTarget)
        return message.reply(`Use: \`${PREFIX}setvip @user [dias]\``);

      if (addVip(firstArgTarget, days)) {
        const tm = await message.guild.members
          .fetch(firstArgTarget)
          .catch(() => null);
        const vr = message.guild.roles.cache.get(process.env.VIP_ROLE_ID);
        if (tm && vr) await tm.roles.add(vr);

        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `✅ **${
                  tm ? tm.user.tag : firstArgTarget
                }** agora é VIP por **${days} dias**!`
              )
              .setColor(NEUTRAL_COLOR),
          ],
        });
      }
      return message.channel.send("⚠️ Usuário já é VIP.");
    }

    // k!addtime
    if (command === "addtime" || command === "renovar") {
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      )
        return message.reply("🔒 Apenas Admins.");
      const days = parseInt(args[1]);
      if (!firstArgTarget || !days)
        return message.reply(`Use: \`${PREFIX}addtime @user <dias>\``);

      const newExpire = addVipTime(firstArgTarget, days);
      if (!newExpire) return message.reply("❌ Usuário não é VIP.");
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `✅ Renovado! Vence em: <t:${Math.floor(newExpire / 1000)}:F>`
            )
            .setColor(NEUTRAL_COLOR),
        ],
      });
    }

    // k!vipadm rem
    if (command === "vipadm" && subCommand === "rem") {
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      )
        return message.reply("🔒 Apenas Admins.");
      const result = removeVip(targetId);
      if (result.success) {
        const tm = await message.guild.members
          .fetch(targetId)
          .catch(() => null);
        const vr = message.guild.roles.cache.get(process.env.VIP_ROLE_ID);
        if (tm && vr) await tm.roles.remove(vr);
        if (result.customRoleId) {
          const cr = message.guild.roles.cache.get(result.customRoleId);
          if (cr) cr.delete().catch(() => {});
        }
        if (result.customChannelId) {
          const cc = message.guild.channels.cache.get(result.customChannelId);
          if (cc) cc.delete().catch(() => {});
        }
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(`🗑️ VIP removido e benefícios deletados.`)
              .setColor(NEUTRAL_COLOR),
          ],
        });
      }
      return message.channel.send("⚠️ Usuário não era VIP.");
    }

    // k!addvip / k!remvip (Texto)
    if (command === "addvip" || command === "remvip") {
      const vipData = getVipData(message.author.id);
      if (!vipData) return message.channel.send("💎 Apenas VIPs.");
      const friendId = args[0]?.replace(/<@!?(\d+)>/, "$1");
      if (!friendId)
        return message.channel.send(`Use: \`${PREFIX}${command} @amigo\``);
      if (!vipData.customRoleId)
        return message.channel.send("❌ Crie sua Tag no painel primeiro.");

      const customRole = message.guild.roles.cache.get(vipData.customRoleId);
      if (!customRole) return message.channel.send("❌ Tag não encontrada.");
      const friendMember = await message.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (!friendMember) return message.channel.send("Usuário não encontrado.");

      if (command === "addvip") {
        const res = addFriend(message.author.id, friendId);
        if (res.success) {
          await friendMember.roles.add(customRole);
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `✅ **${friendMember.user.tag}** recebeu sua tag!`
                )
                .setColor(NEUTRAL_COLOR),
            ],
          });
        } else return message.channel.send(`❌ ${res.msg}`);
      }
      if (command === "remvip") {
        const res = removeFriend(message.author.id, friendId);
        if (res.success) {
          await friendMember.roles.remove(customRole);
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `🗑️ **${friendMember.user.tag}** removido da tag.`
                )
                .setColor(NEUTRAL_COLOR),
            ],
          });
        } else return message.channel.send(`❌ ${res.msg}`);
      }
    }
  },
};
