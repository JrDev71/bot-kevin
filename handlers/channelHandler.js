// handlers/channelHandler.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionsBitField,
  ChannelSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const {
  BTN_CH_CREATE,
  BTN_CH_DELETE,
  BTN_CH_EDIT,
} = require("../commands/channelPanel");
const logEmbed = require("../utils/logEmbed");

const MDL_CREATE = "mdl_ch_create";
const MDL_NAME_EDIT = "mdl_ch_rename"; // Modal para digitar novo nome
const SEL_DEL = "sel_ch_del";
const SEL_EDIT = "sel_ch_edit";

module.exports = async (interaction) => {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();
  const isSelect = interaction.isChannelSelectMenu();

  // Verifica Permissão
  const trustedRoles = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  const isStaff =
    interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    ) ||
    interaction.member.roles.cache.some((r) => trustedRoles.includes(r.id));

  if (!isStaff && (isButton || isModal || isSelect)) {
    // Filtro rápido para garantir que é interação deste handler
    if (
      [BTN_CH_CREATE, BTN_CH_DELETE, BTN_CH_EDIT, SEL_DEL, SEL_EDIT].includes(
        interaction.customId
      )
    ) {
      return interaction.reply({
        content: "🔒 Acesso negado.",
        ephemeral: true,
      });
    }
  }

  // --- BOTÕES ---
  if (isButton) {
    // 1. CRIAR (Precisa de Modal para nome)
    if (interaction.customId === BTN_CH_CREATE) {
      const modal = new ModalBuilder()
        .setCustomId(MDL_CREATE)
        .setTitle("Criar Novo Canal");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("c_name")
            .setLabel("Nome")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("c_type")
            .setLabel("Tipo (texto/voz)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("texto")
            .setRequired(true)
        )
      );
      return interaction.showModal(modal);
    }
    // 2. DELETAR (Menu de Seleção)
    if (interaction.customId === BTN_CH_DELETE) {
      const row = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(SEL_DEL)
          .setPlaceholder("Selecione o canal para DELETAR")
      );
      return interaction.reply({
        content: "Selecione o canal para apagar:",
        components: [row],
        ephemeral: true,
      });
    }
    // 3. EDITAR (Menu de Seleção)
    if (interaction.customId === BTN_CH_EDIT) {
      const row = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(SEL_EDIT)
          .setPlaceholder("Selecione o canal para EDITAR")
      );
      return interaction.reply({
        content: "Qual canal você quer renomear?",
        components: [row],
        ephemeral: true,
      });
    }
  }

  // --- SELETORES ---
  if (isSelect) {
    if (interaction.customId === SEL_DEL) {
      await interaction.deferUpdate();
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel)
        return interaction.editReply({
          content: "Canal não encontrado.",
          components: [],
        });

      try {
        const name = channel.name;
        await channel.delete();

        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        await logEmbed(
          interaction.client,
          logChannelId,
          "Canal Deletado (Painel)",
          `**#${name}** deletado por <@${interaction.user.id}>`,
          0xff0000
        );

        return interaction.editReply({
          content: `🗑️ Canal **${name}** deletado com sucesso.`,
          components: [],
        });
      } catch (e) {
        return interaction.editReply({
          content: `Erro ao deletar: ${e.message}`,
          components: [],
        });
      }
    }

    if (interaction.customId === SEL_EDIT) {
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel)
        return interaction.reply({ content: "Canal sumiu.", ephemeral: true });

      // Abre modal para digitar o novo nome. Passa ID no customId do modal.
      const modal = new ModalBuilder()
        .setCustomId(`${MDL_NAME_EDIT}_${channelId}`)
        .setTitle(`Editar: ${channel.name.slice(0, 20)}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("c_newname")
            .setLabel("Novo Nome")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(channel.name)
        )
      );
      return interaction.showModal(modal);
    }
  }

  // --- MODAIS ---
  if (isModal) {
    await interaction.deferReply({ ephemeral: true });
    const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;

    if (interaction.customId === MDL_CREATE) {
      const name = interaction.fields.getTextInputValue("c_name");
      const typeInput = interaction.fields
        .getTextInputValue("c_type")
        .toLowerCase();
      const type = typeInput.includes("voz")
        ? ChannelType.GuildVoice
        : ChannelType.GuildText;
      try {
        const ch = await interaction.guild.channels.create({ name, type });
        interaction.editReply(`✅ Canal ${ch} criado.`);
        await logEmbed(
          interaction.client,
          logChannelId,
          "Canal Criado (Painel)",
          `**${ch.name}** por <@${interaction.user.id}>`,
          0x00ff00
        );
      } catch (e) {
        interaction.editReply(`Erro: ${e.message}`);
      }
    }

    if (interaction.customId.startsWith(MDL_NAME_EDIT)) {
      const channelId = interaction.customId.split("_").pop();
      const newName = interaction.fields.getTextInputValue("c_newname");
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) return interaction.editReply("Canal não existe mais.");
      try {
        await channel.setName(newName);
        interaction.editReply(`✏️ Canal renomeado para **${newName}**.`);
        await logEmbed(
          interaction.client,
          logChannelId,
          "Canal Editado (Painel)",
          `Editado por <@${interaction.user.id}>`,
          0xf1c40f
        );
      } catch (e) {
        interaction.editReply(`Erro: ${e.message}`);
      }
    }
    return true;
  }

  return false;
};
