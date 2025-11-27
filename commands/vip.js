// commands/vip.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// Importa as funções do gerenciador (Agora assíncronas via Prisma)
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

// IDs dos Botões (Exportados para o interactionCreate)
const BTN_TAG = "vip_manage_tag";
const BTN_CHANNEL = "vip_manage_channel";
const BTN_ADD_MEMBER = "vip_add_member_role";

// CONFIGURAÇÃO VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

// Permissões de Gerente VIP (Além de Admin)
const VIP_MANAGER_ROLES = [
  "1435040516814147715",
  // "ID_DO_CARGO_GERENTE"
];

function isVipManager(member) {
  const managers = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some(
      (role) =>
        VIP_MANAGER_ROLES.includes(role.id) || managers.includes(role.id)
    )
  );
}

// Helper Visual
const createEmbed = (title, description, color = COLOR_NEUTRAL) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setImage(HEADER_IMAGE)
    .setTimestamp();
};

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
      // AWAIT OBRIGATÓRIO (Banco de Dados)
      const userData = await getVipData(message.author.id);

      if (!userData) {
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:vd_diamanteK:1443648289068285972> Status VIP",
              "Você não possui um plano VIP ativo."
            ),
          ],
        });
      }

      const expiresDate = userData.expiresAt
        ? `<t:${Math.floor(userData.expiresAt / 1000)}:R>`
        : "Nunca";
      const friendCount = userData.friends ? userData.friends.length : 0;

      const embed = new EmbedBuilder()
        .setTitle(`<:vd_diamanteK:1443648289068285972> Painel de Controle VIP`)
        .setDescription(`Gerencie seus benefícios exclusivos abaixo.`)
        .setColor(COLOR_NEUTRAL)
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

    // --- 2. k!setvip @user [dias] (ADMIN) ---
    if (command === "setvip") {
      if (!isVipManager(message.member))
        return message.reply("<:cadeado:1443642375833518194> Sem permissão.");

      const days = args[1] ? parseInt(args[1]) : 30;
      if (!firstArgTarget)
        return message.reply(
          `<:Nao:1443642030637977743> Uso: \`${PREFIX}setvip @usuario [dias]\``
        );

      // AWAIT
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
            createEmbed(
              "<:certo_froid:1443643346722754692> Sucesso",
              `**${
                targetMember ? targetMember.user.tag : firstArgTarget
              }** agora é VIP por **${days} dias**!`,
              0x00ff00
            ),
          ],
        });
      }
      return message.channel.send(
        "<:am_avisoK:1443645307358544124> Este usuário já está na lista VIP. Use `k!addtime` para estender."
      );
    }

    // --- 3. k!addtime @user <dias> (RENOVAR) ---
    if (command === "addtime" || command === "renovar") {
      if (!isVipManager(message.member))
        return message.reply("<:cadeado:1443642375833518194> Sem permissão.");

      const days = parseInt(args[1]);
      if (!firstArgTarget || !days)
        return message.reply(
          `<:Nao:1443642030637977743> Uso: \`${PREFIX}addtime @usuario <dias>\``
        );

      // AWAIT
      const newExpire = await addVipTime(firstArgTarget, days);
      if (!newExpire)
        return message.reply("<:Nao:1443642030637977743> Usuário não é VIP.");

      return message.channel.send({
        embeds: [
          createEmbed(
            "<:certo_froid:1443643346722754692> Renovado",
            `Tempo adicionado! Novo vencimento: <t:${Math.floor(
              newExpire / 1000
            )}:F>`,
            0x00ff00
          ),
        ],
      });
    }

    // --- 4. k!vipadm rem (ADMIN REMOVE) ---
    if (command === "vipadm" && subCommand === "rem") {
      if (!isVipManager(message.member))
        return message.reply("<:cadeado:1443642375833518194> Sem permissão.");

      // AWAIT
      const result = await removeVip(targetId);

      if (result.success) {
        const tm = await message.guild.members
          .fetch(targetId)
          .catch(() => null);
        const vr = message.guild.roles.cache.get(process.env.VIP_ROLE_ID);
        if (tm && vr) await tm.roles.remove(vr);

        // Limpeza de Tag e Canal
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
            createEmbed(
              "<:vmc_lixeiraK:1443653159779041362> VIP Removido",
              "Benefícios e cargos deletados.",
              COLOR_NEUTRAL
            ),
          ],
        });
      }
      return message.channel.send(
        "<:am_avisoK:1443645307358544124> Usuário não era VIP."
      );
    }

    // --- 5. k!addvip / k!remvip (TEXTO) ---
    if (command === "addvip" || command === "remvip") {
      // AWAIT
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
          "<:Nao:1443642030637977743> Erro: Sua tag exclusiva não foi encontrada (deletada?)."
        );

      const friendMember = await message.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (!friendMember) return message.channel.send("Usuário não encontrado.");

      if (command === "addvip") {
        // AWAIT
        const result = await addFriend(message.author.id, friendId);
        if (result.success) {
          await friendMember.roles.add(customRole);
          return message.channel.send({
            embeds: [
              createEmbed(
                "<:certo_froid:1443643346722754692> Amigo Adicionado",
                `**${friendMember.user.tag}** recebeu sua tag!`,
                0x00ff00
              ),
            ],
          });
        } else {
          return message.channel.send(
            `<:Nao:1443642030637977743> Erro: ${result.msg}`
          );
        }
      }

      if (command === "remvip") {
        // AWAIT
        const result = await removeFriend(message.author.id, friendId);
        if (result.success) {
          await friendMember.roles.remove(customRole);
          return message.channel.send({
            embeds: [
              createEmbed(
                "<:vmc_lixeiraK:1443653159779041362> Amigo Removido",
                `**${friendMember.user.tag}** foi removido da sua tag.`,
                COLOR_NEUTRAL
              ),
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
