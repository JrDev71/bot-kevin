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

// --- CONFIGURAÇÃO DE PERMISSÕES ---
// Coloque aqui os IDs dos cargos que podem usar setvip, vipadm, addtime
const VIP_MANAGER_ROLES = [
  "1435040516814147715", // Exemplo
];

// IDs dos Botões
const BTN_TAG = "vip_manage_tag";
const BTN_CHANNEL = "vip_manage_channel";
const BTN_ADD_MEMBER = "vip_add_member_role";

/**
 * Função auxiliar para verificar permissão de Gerente VIP
 */
function isVipManager(member) {
  // Permite se for Administrador OU se tiver um dos cargos listados
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some((role) => VIP_MANAGER_ROLES.includes(role.id))
  );
}

module.exports = {
  BTN_TAG,
  BTN_CHANNEL,
  BTN_ADD_MEMBER,

  handleVipCommands: async (message, command, args) => {
    const targetId = args[1]?.replace(/<@!?(\d+)>/, "$1"); // Geralmente o 2º argumento
    const firstArgTarget = args[0]?.replace(/<@!?(\d+)>/, "$1"); // As vezes o 1º
    const subCommand = args[0]?.toLowerCase();

    // --- 1. COMANDO k!vip (PAINEL DO USUÁRIO - TODOS PODEM TENTAR) ---
    if (command === "vip") {
      const userData = getVipData(message.author.id);

      if (!userData) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("💎 Status VIP")
              .setDescription("Você não possui um plano VIP ativo.")
              .setColor(0x2f3136),
          ],
        });
      }

      // Formata a data de expiração
      const expiresDate = userData.expiresAt
        ? `<t:${Math.floor(userData.expiresAt / 1000)}:R>`
        : "Nunca";

      const embed = new EmbedBuilder()
        .setTitle(`💎 Painel de Controle VIP`)
        .setDescription(
          `Olá, **${message.author.username}**! Gerencie seus benefícios exclusivos abaixo.`
        )
        .setColor(0xf1c40f)
        .addFields(
          {
            name: "⏳ Expira em",
            value: expiresDate,
            inline: true,
          },
          {
            name: "🏷️ Sua Tag Exclusiva",
            value: userData.customRoleId
              ? `<@&${userData.customRoleId}>`
              : "❌ Não criada",
            inline: true,
          },
          {
            name: "🔊 Seu Canal Privado",
            value: userData.customChannelId
              ? `<#${userData.customChannelId}>`
              : "❌ Não criado",
            inline: true,
          },
          {
            name: "👥 Amigos na Tag",
            value: `**${userData.friends.length}** (Ilimitado)`,
            inline: true,
          }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(BTN_TAG)
          .setLabel("Configurar Tag")
          .setEmoji("🏷️")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(BTN_CHANNEL)
          .setLabel("Gerenciar Canal")
          .setEmoji("🔊")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BTN_ADD_MEMBER)
          .setLabel("Adicionar Amigo")
          .setEmoji("👥")
          .setStyle(ButtonStyle.Success)
      );

      return message.channel.send({ embeds: [embed], components: [row] });
    }

    // --- 2. k!setvip @user [dias] (RESTRITO) ---
    if (command === "setvip") {
      if (!isVipManager(message.member)) {
        return message.reply("🔒 Apenas a equipe autorizada pode dar VIP.");
      }

      if (!firstArgTarget)
        return message.reply(`❌ Uso: \`${PREFIX}setvip @usuario [dias]\``);

      const days = args[1] ? parseInt(args[1]) : 30; // Padrão 30 dias

      if (addVip(firstArgTarget, days)) {
        const targetMember = await message.guild.members
          .fetch(firstArgTarget)
          .catch(() => null);
        const vipRole = message.guild.roles.cache.get(process.env.VIP_ROLE_ID);

        if (targetMember && vipRole) await targetMember.roles.add(vipRole);

        return message.channel.send(
          `✅ **${
            targetMember ? targetMember.user.tag : firstArgTarget
          }** agora é VIP por **${days} dias**!`
        );
      }
      return message.channel.send(
        "⚠️ Este usuário já é VIP. Use `k!addtime` para estender."
      );
    }

    // --- 3. k!addtime @user <dias> (RESTRITO) ---
    if (command === "addtime" || command === "renovar") {
      if (!isVipManager(message.member)) {
        return message.reply("🔒 Apenas a equipe autorizada pode renovar VIP.");
      }

      const days = parseInt(args[1]);
      if (!firstArgTarget || !days)
        return message.reply(`❌ Uso: \`${PREFIX}addtime @usuario <dias>\``);

      const newExpire = addVipTime(firstArgTarget, days);
      if (!newExpire) return message.reply("❌ Este usuário não é VIP.");

      return message.channel.send(
        `✅ Tempo adicionado! Novo vencimento: <t:${Math.floor(
          newExpire / 1000
        )}:F>`
      );
    }

    // --- 4. k!vipadm (RESTRITO) ---
    if (command === "vipadm") {
      if (!isVipManager(message.member))
        return message.reply("🔒 Apenas a equipe autorizada.");

      if (subCommand === "rem" && targetId) {
        const result = removeVip(targetId);
        if (result.success) {
          const tm = await message.guild.members
            .fetch(targetId)
            .catch(() => null);
          const vr = message.guild.roles.cache.get(process.env.VIP_ROLE_ID);
          if (tm && vr) await tm.roles.remove(vr);

          if (result.customRoleId) {
            const cr = message.guild.roles.cache.get(result.customRoleId);
            if (cr) await cr.delete("VIP Removido").catch(() => {});
          }
          if (result.customChannelId) {
            const cc = message.guild.channels.cache.get(result.customChannelId);
            if (cc) await cc.delete("VIP Removido").catch(() => {});
          }
          return message.channel.send(`🗑️ VIP removido e benefícios limpos.`);
        }
        return message.channel.send("⚠️ Usuário não era VIP.");
      }
      return message.reply(
        `Uso: \`${PREFIX}vipadm rem @usuario\` (Use \`${PREFIX}setvip\` para adicionar)`
      );
    }

    // --- 5. k!addvip / k!remvip (USUÁRIO VIP: AMIGOS) ---
    if (command === "addvip" || command === "remvip") {
      const vipData = getVipData(message.author.id);
      if (!vipData)
        return message.channel.send(
          "💎 Apenas usuários VIP podem usar este comando."
        );

      const friendId = args[0]?.replace(/<@!?(\d+)>/, "$1");
      if (!friendId)
        return message.channel.send(`Uso: \`${PREFIX}${command} @amigo\``);

      if (!vipData.customRoleId)
        return message.channel.send(
          "❌ Crie sua Tag Exclusiva no painel `k!vip` primeiro."
        );

      const customRole = message.guild.roles.cache.get(vipData.customRoleId);
      if (!customRole)
        return message.channel.send(
          "❌ Erro: Sua tag exclusiva não foi encontrada."
        );

      const friendMember = await message.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (!friendMember) return message.channel.send("Usuário não encontrado.");

      if (command === "addvip") {
        const result = addFriend(message.author.id, friendId);
        if (result.success) {
          await friendMember.roles.add(customRole);
          return message.channel.send(
            `✅ **${friendMember.user.tag}** recebeu sua tag!`
          );
        } else {
          return message.channel.send(`❌ Erro: ${result.msg}`);
        }
      }

      if (command === "remvip") {
        const result = removeFriend(message.author.id, friendId);
        if (result.success) {
          await friendMember.roles.remove(customRole);
          return message.channel.send(
            `🗑️ **${friendMember.user.tag}** foi removido da sua tag.`
          );
        } else {
          return message.channel.send(`❌ Erro: ${result.msg}`);
        }
      }
    }
  },
};
