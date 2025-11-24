// handlers/channelHandler.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const {
  BTN_CH_CREATE,
  BTN_CH_DELETE,
  BTN_CH_EDIT,
} = require("../commands/channelPanel");
const logEmbed = require("../utils/logEmbed");

// IDs dos Modais
const MODAL_CREATE = "mdl_ch_create";
const MODAL_DELETE = "mdl_ch_delete";
const MODAL_EDIT = "mdl_ch_edit";

module.exports = async (interaction) => {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();

  // Verificação de Segurança (Staff)
  const trustedRoles = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  const isStaff =
    interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    ) ||
    interaction.member.roles.cache.some((r) => trustedRoles.includes(r.id));

  // Se não for Staff e tentar interagir com esses botões
  if (!isStaff && (isButton || isModal)) {
    if (
      [BTN_CH_CREATE, BTN_CH_DELETE, BTN_CH_EDIT].includes(
        interaction.customId
      ) ||
      [MODAL_CREATE, MODAL_DELETE, MODAL_EDIT].includes(interaction.customId)
    ) {
      return interaction.reply({
        content: "🔒 Acesso negado.",
        ephemeral: true,
      });
    }
  }

  // --- BOTÕES ---
  if (isButton) {
    if (interaction.customId === BTN_CH_CREATE) {
      const modal = new ModalBuilder()
        .setCustomId(MODAL_CREATE)
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
    if (interaction.customId === BTN_CH_DELETE) {
      const modal = new ModalBuilder()
        .setCustomId(MODAL_DELETE)
        .setTitle("Deletar Canal");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("c_id")
            .setLabel("ID do Canal")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
      return interaction.showModal(modal);
    }
    if (interaction.customId === BTN_CH_EDIT) {
      const modal = new ModalBuilder()
        .setCustomId(MODAL_EDIT)
        .setTitle("Editar Este Canal");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("c_newname")
            .setLabel("Novo Nome")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
      return interaction.showModal(modal);
    }
  }

  // --- MODAIS ---
  if (isModal) {
    // 1. CRIAR
    if (interaction.customId === MODAL_CREATE) {
      await interaction.deferReply({ ephemeral: true });
      const name = interaction.fields.getTextInputValue("c_name");
      const typeInput = interaction.fields
        .getTextInputValue("c_type")
        .toLowerCase();
      const type = typeInput.includes("voz")
        ? ChannelType.GuildVoice
        : ChannelType.GuildText;

      try {
        const ch = await interaction.guild.channels.create({
          name: name,
          type: type,
        });
        interaction.editReply(`✅ Canal ${ch} criado com sucesso.`);

        // Log
        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        await logEmbed(
          interaction.client,
          logChannelId,
          "Canal Criado (Painel)",
          `Criado por <@${interaction.user.id}>: ${ch.name}`,
          0x00ff00
        );
      } catch (e) {
        interaction.editReply(`Erro: ${e.message}`);
      }
      return true;
    }

    // 2. DELETAR
    if (interaction.customId === MODAL_DELETE) {
      await interaction.deferReply({ ephemeral: true });
      const id = interaction.fields.getTextInputValue("c_id");
      const ch = interaction.guild.channels.cache.get(id);

      if (!ch) return interaction.editReply("❌ Canal não encontrado.");

      try {
        const name = ch.name;
        await ch.delete();
        interaction.editReply(`🗑️ Canal **${name}** deletado.`);

        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        await logEmbed(
          interaction.client,
          logChannelId,
          "Canal Deletado (Painel)",
          `Deletado por <@${interaction.user.id}>: ${name} (${id})`,
          0xff0000
        );
      } catch (e) {
        interaction.editReply(`Erro: ${e.message}`);
      }
      return true;
    }

    // 3. EDITAR
    if (interaction.customId === MODAL_EDIT) {
      await interaction.deferReply({ ephemeral: true });
      const newName = interaction.fields.getTextInputValue("c_newname");
      try {
        const oldName = interaction.channel.name;
        await interaction.channel.setName(newName);
        interaction.editReply(`✏️ Canal renomeado para **${newName}**.`);

        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        await logEmbed(
          interaction.client,
          logChannelId,
          "Canal Editado (Painel)",
          `Editado por <@${interaction.user.id}>: ${oldName} -> ${newName}`,
          0xf1c40f
        );
      } catch (e) {
        interaction.editReply(`Erro: ${e.message}`);
      }
      return true;
    }
  }

  return false;
};
