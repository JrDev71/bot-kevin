// handlers/vipHandler.js
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

const { getVipData, updateVipData, addFriend } = require("../vipManager");
const { BTN_TAG, BTN_CHANNEL, BTN_ADD_MEMBER } = require("../commands/vip");

const MODAL_TAG = "vip_modal_tag";
const MODAL_CHANNEL = "vip_modal_channel";
const MODAL_ADD_USER = "vip_modal_add_user";

module.exports = async (interaction) => {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();

  // 1. Botões -> Abrir Modais
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
            .setLabel("Cor Hex")
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
            .setLabel("Nome (ou 'deletar')")
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

  // 2. Processamento Modais
  if (
    isModal &&
    [MODAL_TAG, MODAL_CHANNEL, MODAL_ADD_USER].includes(interaction.customId)
  ) {
    await interaction.deferReply({ ephemeral: true });
    const vipData = getVipData(interaction.user.id);
    if (!vipData) return interaction.editReply("Erro: Você não é VIP.");

    // --- A. CONFIGURAR TAG ---
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
          interaction.editReply(`✅ Tag editada para **${tagName}**!`);
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
          });
          const member = await interaction.guild.members.fetch(
            interaction.user.id
          );
          await member.roles.add(role);
          updateVipData(interaction.user.id, { customRoleId: role.id });

          // [NOVO] Se o canal já existe, adiciona permissão para a nova tag
          if (vipData.customChannelId) {
            const channel = await interaction.guild.channels
              .fetch(vipData.customChannelId)
              .catch(() => null);
            if (channel) {
              await channel.permissionOverwrites.edit(role.id, {
                Connect: true,
                ViewChannel: true,
              });
            }
          }

          interaction.editReply("✅ Tag criada e configurada!");
        }
      } catch (e) {
        interaction.editReply("❌ Erro ao configurar tag.");
      }
    }

    // --- B. CONFIGURAR CANAL ---
    else if (interaction.customId === MODAL_CHANNEL) {
      const channelName = interaction.fields.getTextInputValue("channel_name");
      const categoryId = process.env.VIP_CATEGORY_ID;

      if (channelName.toLowerCase() === "deletar" && vipData.customChannelId) {
        const ch = await interaction.guild.channels
          .fetch(vipData.customChannelId)
          .catch(() => null);
        if (ch) await ch.delete();
        updateVipData(interaction.user.id, { customChannelId: null });
        return interaction.editReply("🗑️ Canal deletado.");
      }

      try {
        let channel;
        if (vipData.customChannelId)
          channel = await interaction.guild.channels
            .fetch(vipData.customChannelId)
            .catch(() => null);

        if (channel) {
          await channel.setName(channelName);
          interaction.editReply(`✅ Canal renomeado.`);
        } else {
          if (!categoryId)
            return interaction.editReply(
              "⚠️ Configure VIP_CATEGORY_ID no .env"
            );

          // Define as permissões iniciais
          const overwrites = [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.Connect],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.ManageChannels,
              ],
            },
          ];

          // [NOVO] Se a Tag já existe, adiciona permissão para ela na criação
          if (vipData.customRoleId) {
            overwrites.push({
              id: vipData.customRoleId,
              allow: [
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.ViewChannel,
              ],
            });
          }

          channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: categoryId,
            permissionOverwrites: overwrites,
          });
          updateVipData(interaction.user.id, { customChannelId: channel.id });
          interaction.editReply("✅ Canal criado!");
        }
      } catch (e) {
        interaction.editReply("❌ Erro ao criar canal.");
      }
    }

    // --- C. ADD AMIGO ---
    else if (interaction.customId === MODAL_ADD_USER) {
      const friendId = interaction.fields.getTextInputValue("friend_id");
      if (!vipData.customRoleId)
        return interaction.editReply("❌ Crie sua tag primeiro.");

      const res = addFriend(interaction.user.id, friendId);
      if (!res.success) return interaction.editReply(`❌ ${res.msg}`);

      const friend = await interaction.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (friend) {
        const role = await interaction.guild.roles.fetch(vipData.customRoleId);
        await friend.roles.add(role);
        interaction.editReply(`✅ Amigo adicionado!`);
      } else {
        interaction.editReply("❌ Amigo não encontrado.");
      }
    }
    return true;
  }
  return false;
};
