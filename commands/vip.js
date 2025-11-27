// commands/vip.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// Importa as funções de banco de dados
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
  "https://i.pinimg.com/736x/4d/68/8e/4d688edfeedd4bec17b856d2a2ad7241.jpg";
const NEUTRAL_COLOR = 0x2f3136;

// --- CONFIGURAÇÃO DE PERMISSÕES ---
// Coloque aqui os IDs dos cargos que podem usar setvip, vipadm, addtime
const VIP_MANAGER_ROLES = ["1435040516814147715", "1435040519918059521"];

/**
 * Função auxiliar para verificar permissão de Gerente VIP
 */
function isVipManager(member) {
  const managers = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  // Permite se for Administrador OU se tiver um dos cargos na lista VIP_MANAGER_ROLES ou STAFF_TRUSTED_ROLES
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some(
      (role) =>
        VIP_MANAGER_ROLES.includes(role.id) || managers.includes(role.id)
    )
  );
}

module.exports = {
  BTN_TAG,
  BTN_CHANNEL,
  BTN_ADD_MEMBER,

  handleVipCommands: async (message, command, args) => {
    const targetId = args[1]?.replace(/<@!?(\d+)>/, "$1");
    const firstArgTarget = args[0]?.replace(/<@!?(\d+)>/, "$1");
    const subCommand = args[0]?.toLowerCase();

    // --- 1. COMANDO k!vip (PAINEL DO USUÁRIO) ---
    if (command === "vip") {
      // AGORA USA AWAIT
      const userData = await getVipData(message.author.id);

      if (!userData) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("<:vd_diamanteK:1443648289068285972> Status VIP")
              .setDescription("Você não possui um plano VIP ativo.")
              .setColor(NEUTRAL_COLOR)
              .setImage(HEADER_IMAGE),
          ],
        });
      }

      const expiresDate = userData.expiresAt
        ? `<t:${Math.floor(userData.expiresAt / 1000)}:R>`
        : "Nunca";
      const friendCount = userData.friends ? userData.friends.length : 0;

      const embed = new EmbedBuilder()
        .setTitle(`Painel de Controle VIP`)
        .setDescription(`Gerencie seus benefícios exclusivos abaixo.`)
        .setColor(NEUTRAL_COLOR)
        .setImage(HEADER_IMAGE)
        .addFields(
          {
            name: "<:temporizador:1443649098195402865> Expira em",
            value: expiresDate,
            inline: true,
          },
          {
            name: "<:label:1443650019562622976> Tag Exclusiva",
            value: userData.customRoleId
              ? `<@&${userData.customRoleId}>`
              : "<:Nao:1443642030637977743> Não criada",
            inline: true,
          },
          {
            name: "<:voz:1443651112644378818> Canal Privado",
            value: userData.customChannelId
              ? `<#${userData.customChannelId}>`
              : "<:Nao:1443642030637977743> Não criado",
            inline: true,
          },
          {
            name: "👥 Amigos",
            value: `**${friendCount}** (Ilimitado)`,
            inline: false,
          }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(BTN_TAG)
          .setLabel("Configurar Tag")
          .setEmoji("<:label:1443650019562622976>")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BTN_CHANNEL)
          .setLabel("Gerenciar Canal")
          .setEmoji("<:voz:1443651112644378818>")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BTN_ADD_MEMBER)
          .setLabel("Adicionar Amigo")
          .setEmoji("👥")
          .setStyle(ButtonStyle.Secondary)
      );

      return message.channel.send({ embeds: [embed], components: [row] });
    }

    // --- 2. COMANDO k!setvip (ADMIN: ADICIONAR VIP DIRETO) ---
    if (command === "setvip") {
      if (!isVipManager(message.member)) {
        return message.reply(
          "<:cadeado:1443642375833518194> Apenas a equipe autorizada pode dar VIP."
        );
      }

      if (!firstArgTarget)
        return message.reply(
          `<:Nao:1443642030637977743> Uso: \`${PREFIX}setvip @usuario [dias]\``
        );

      const days = args[1] ? parseInt(args[1]) : 30; // Padrão 30 dias

      // AGORA USA AWAIT
      if (await addVip(firstArgTarget, days)) {
        const targetMember = await message.guild.members
          .fetch(firstArgTarget)
          .catch(() => null);
        const vipRole = message.guild.roles.cache.get(process.env.VIP_ROLE_ID);

        if (targetMember && vipRole) {
          await targetMember.roles
            .add(vipRole)
            .catch((e) => console.error("Erro ao dar cargo VIP:", e));
        }

        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `<:certo_froid:1443643346722754692> **${
                  targetMember ? targetMember.user.tag : firstArgTarget
                }** agora é VIP por **${days} dias**!`
              )
              .setColor(NEUTRAL_COLOR),
          ],
        });
      }
      return message.channel.send(
        "<:am_avisoK:1443645307358544124> Este usuário já está na lista VIP. Use `k!addtime` para estender."
      );
    }

    // --- 3. COMANDO k!addtime (ADMIN: RENOVAR) ---
    if (command === "addtime" || command === "renovar") {
      if (!isVipManager(message.member)) {
        return message.reply(
          "<:cadeado:1443642375833518194> Apenas a equipe autorizada pode renovar VIP."
        );
      }

      const days = parseInt(args[1]);
      if (!firstArgTarget || !days)
        return message.reply(
          `<:Nao:1443642030637977743> Uso: \`${PREFIX}addtime @usuario <dias>\``
        );

      // AGORA USA AWAIT
      const newExpire = await addVipTime(firstArgTarget, days);
      if (!newExpire)
        return message.reply(
          "<:Nao:1443642030637977743> Este usuário não é VIP."
        );

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `<:certo_froid:1443643346722754692> Tempo adicionado! Novo vencimento: <t:${Math.floor(
                newExpire / 1000
              )}:F>`
            )
            .setColor(NEUTRAL_COLOR),
        ],
      });
    }

    // --- 4. COMANDO k!vipadm (GERENCIAR / REMOVER) ---
    if (command === "vipadm") {
      if (!isVipManager(message.member))
        return message.reply("<:cadeado:1443642375833518194> Apenas Admins.");

      if (subCommand === "rem" && targetId) {
        // AGORA USA AWAIT
        const result = await removeVip(targetId);

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
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `<:vmc_lixeiraK:1443653159779041362> VIP removido e benefícios limpos.`
                )
                .setColor(NEUTRAL_COLOR),
            ],
          });
        }
        return message.channel.send(
          "<:am_avisoK:1443645307358544124> Usuário não era VIP."
        );
      }
      return message.reply(`Uso: \`${PREFIX}vipadm rem @usuario\``);
    }

    // --- 5. COMANDO k!addvip / k!remvip (USUÁRIO VIP: AMIGOS) ---
    if (command === "addvip" || command === "remvip") {
      // AGORA USA AWAIT
      const vipData = await getVipData(message.author.id);

      if (!vipData)
        return message.channel.send(
          "<:vd_diamanteK:1443648289068285972> Apenas usuários VIP podem usar este comando."
        );

      const friendId = args[0]?.replace(/<@!?(\d+)>/, "$1");
      if (!friendId)
        return message.channel.send(`Uso: \`${PREFIX}${command} @amigo\``);

      if (!vipData.customRoleId)
        return message.channel.send(
          "<:Nao:1443642030637977743> Crie sua Tag Exclusiva no painel `k!vip` primeiro."
        );

      const customRole = message.guild.roles.cache.get(vipData.customRoleId);
      if (!customRole)
        return message.channel.send(
          "<:Nao:1443642030637977743> Erro: Sua tag exclusiva não foi encontrada."
        );

      const friendMember = await message.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (!friendMember) return message.channel.send("Usuário não encontrado.");

      if (command === "addvip") {
        // AGORA USA AWAIT
        const result = await addFriend(message.author.id, friendId);
        if (result.success) {
          await friendMember.roles.add(customRole);
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `<:certo_froid:1443643346722754692> **${friendMember.user.tag}** recebeu sua tag!`
                )
                .setColor(NEUTRAL_COLOR),
            ],
          });
        } else {
          return message.channel.send(
            `<:Nao:1443642030637977743> Erro: ${result.msg}`
          );
        }
      }

      if (command === "remvip") {
        // AGORA USA AWAIT
        const result = await removeFriend(message.author.id, friendId);
        if (result.success) {
          await friendMember.roles.remove(customRole);
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `<:vmc_lixeiraK:1443653159779041362> **${friendMember.user.tag}** foi removido da sua tag.`
                )
                .setColor(NEUTRAL_COLOR),
            ],
          });
        } else {
          return message.channel.send(
            `<:Nao:1443642030637977743> Erro: ${result.msg}`
          );
        }
      }
    }
  },
};
