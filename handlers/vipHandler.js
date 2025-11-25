// handlers/vipHandler.js
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");

const { getVipData, updateVipData, addFriend } = require("../vipManager");
const { BTN_TAG, BTN_CHANNEL, BTN_ADD_MEMBER } = require("../commands/vip");
const logEmbed = require("../utils/logEmbed");

const MODAL_TAG = "vip_modal_tag";
const MODAL_CHANNEL = "vip_modal_channel";
const MODAL_ADD_USER = "vip_modal_add_user";

// CONFIG VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/1323511636518371360/1323511704248258560/S2_banner_1.png?ex=6775761a&is=6774249a&hm=52d8e058752746d0f07363140799265a78070602456c93537c7d1135c7203d1a&";
const NEUTRAL_COLOR = 0x2f3136;

// Helper para respostas padronizadas
const replyEmbed = (interaction, title, desc) => {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(NEUTRAL_COLOR)
    .setImage(HEADER_IMAGE)
    .setTimestamp();
  return interaction.editReply({ embeds: [embed], content: null });
};

module.exports = async (interaction) => {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();

  // 1. BOTÕES -> ABRIR MODAIS
  if (
    isButton &&
    [BTN_TAG, BTN_CHANNEL, BTN_ADD_MEMBER].includes(interaction.customId)
  ) {
    if (interaction.customId === BTN_TAG) {
      const modal = new ModalBuilder()
        .setCustomId(MODAL_TAG)
        .setTitle("Configurar Tag");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("tag_name")
            .setLabel("Nome")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("tag_color")
            .setLabel("Cor Hex (Ex: #FFFFFF)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        )
      );
      await interaction.showModal(modal);
    } else if (interaction.customId === BTN_CHANNEL) {
      const modal = new ModalBuilder()
        .setCustomId(MODAL_CHANNEL)
        .setTitle("Configurar Canal");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("channel_name")
            .setLabel("Nome (digite 'deletar' p/ apagar)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
      await interaction.showModal(modal);
    } else if (interaction.customId === BTN_ADD_MEMBER) {
      const modal = new ModalBuilder()
        .setCustomId(MODAL_ADD_USER)
        .setTitle("Adicionar Amigo");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("friend_id")
            .setLabel("ID do Amigo")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
      await interaction.showModal(modal);
    }
    return true;
  }

  // 2. MODAIS -> LÓGICA
  if (
    isModal &&
    [MODAL_TAG, MODAL_CHANNEL, MODAL_ADD_USER].includes(interaction.customId)
  ) {
    await interaction.deferReply({ ephemeral: true });
    const vipData = getVipData(interaction.user.id);
    const logChannelId =
      interaction.client.config.PD_LOG_CHANNEL_ID ||
      interaction.client.config.LOG_CHANNEL_ID;

    if (!vipData)
      return replyEmbed(
        interaction,
        "Erro",
        "Você não possui um plano VIP ativo."
      );

    // A. TAG
    if (interaction.customId === MODAL_TAG) {
      const tagName = interaction.fields.getTextInputValue("tag_name");
      const tagColor =
        interaction.fields.getTextInputValue("tag_color") || "#FFFFFF";
      try {
        let role;
        if (vipData.customRoleId)
          role = await interaction.guild.roles
            .fetch(vipData.customRoleId)
            .catch(() => null);

        if (role) {
          await role.edit({ name: tagName, color: tagColor });
          replyEmbed(
            interaction,
            "Sucesso",
            `✅ Tag editada para **${tagName}**!`
          );
        } else {
          const anchorId = process.env.VIP_ANCHOR_ROLE_ID;
          const anchorRole = anchorId
            ? interaction.guild.roles.cache.get(anchorId)
            : null;
          const position = anchorRole ? anchorRole.position - 1 : 1;

          role = await interaction.guild.roles.create({
            name: tagName,
            color: tagColor,
            position,
            reason: `VIP: ${interaction.user.tag}`,
          });
          const member = await interaction.guild.members.fetch(
            interaction.user.id
          );
          await member.roles.add(role);
          updateVipData(interaction.user.id, { customRoleId: role.id });

          // Sincroniza canal se existir
          if (vipData.customChannelId) {
            const ch = await interaction.guild.channels
              .fetch(vipData.customChannelId)
              .catch(() => null);
            if (ch)
              await ch.permissionOverwrites.edit(role.id, {
                Connect: true,
                ViewChannel: true,
              });
          }
          replyEmbed(
            interaction,
            "Sucesso",
            `✅ Tag **${tagName}** criada e vinculada!`
          );
        }
      } catch (e) {
        replyEmbed(
          interaction,
          "Erro",
          "Falha ao configurar tag. Verifique hierarquia do bot."
        );
      }
    }

    // B. CANAL
    else if (interaction.customId === MODAL_CHANNEL) {
      const channelName = interaction.fields.getTextInputValue("channel_name");
      const categoryId = process.env.VIP_CATEGORY_ID;
      const verifiedRoleId = process.env.VERIFIED_ROLE_ID;

      if (channelName.toLowerCase() === "deletar") {
        if (vipData.customChannelId) {
          const ch = await interaction.guild.channels
            .fetch(vipData.customChannelId)
            .catch(() => null);
          if (ch) await ch.delete();
          updateVipData(interaction.user.id, { customChannelId: null });
          return replyEmbed(interaction, "Sucesso", "🗑️ Canal deletado.");
        }
        return replyEmbed(
          interaction,
          "Erro",
          "Você não tem canal para deletar."
        );
      }

      try {
        let channel;
        if (vipData.customChannelId)
          channel = await interaction.guild.channels
            .fetch(vipData.customChannelId)
            .catch(() => null);

        if (channel) {
          await channel.setName(channelName);
          replyEmbed(
            interaction,
            "Sucesso",
            `✅ Canal renomeado para **${channelName}**.`
          );
        } else {
          if (!categoryId)
            return replyEmbed(
              interaction,
              "Configuração",
              "⚠️ Categoria VIP não configurada."
            );

          const overwrites = [
            {
              id: interaction.guild.id,
              deny: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
              ],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.ManageChannels,
              ],
            },
          ];
          if (verifiedRoleId)
            overwrites.push({
              id: verifiedRoleId,
              allow: [PermissionsBitField.Flags.ViewChannel],
              deny: [PermissionsBitField.Flags.Connect],
            });
          if (vipData.customRoleId)
            overwrites.push({
              id: vipData.customRoleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
              ],
            });

          channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: categoryId,
            permissionOverwrites: overwrites,
          });
          updateVipData(interaction.user.id, { customChannelId: channel.id });
          replyEmbed(
            interaction,
            "Sucesso",
            `✅ Canal **${channelName}** criado!`
          );
        }
      } catch (e) {
        replyEmbed(interaction, "Erro", "Falha ao criar canal.");
      }
    }

    // C. ADD AMIGO
    else if (interaction.customId === MODAL_ADD_USER) {
      const friendId = interaction.fields.getTextInputValue("friend_id");
      if (!vipData.customRoleId)
        return replyEmbed(interaction, "Atenção", "❌ Crie sua tag primeiro.");

      const res = addFriend(interaction.user.id, friendId);
      if (!res.success) return replyEmbed(interaction, "Erro", `❌ ${res.msg}`);

      const friend = await interaction.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (friend) {
        const role = await interaction.guild.roles
          .fetch(vipData.customRoleId)
          .catch(() => null);
        if (role) await friend.roles.add(role);
        replyEmbed(
          interaction,
          "Sucesso",
          `✅ **${friend.user.tag}** agora possui sua tag!`
        );
      } else {
        replyEmbed(
          interaction,
          "Erro",
          "❌ Usuário não encontrado no servidor."
        );
      }
    }
    return true;
  }
  return false;
};
