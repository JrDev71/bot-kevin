// commands/rolePanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require("discord.js");

const logEmbed = require("../utils/logEmbed");

// IDs dos Botões
const BTN = {
  CREATE: "btn_role_create",
  EDIT: "btn_role_edit",
  DELETE: "btn_role_delete",
  ADD: "btn_role_add_user",
  REM: "btn_role_rem_user",
};

// IDs dos Modais
const MDL = {
  CREATE: "mdl_role_create",
  EDIT: "mdl_role_edit",
  DELETE: "mdl_role_delete",
  ADD: "mdl_role_add",
  REM: "mdl_role_rem",
};

// --- FUNÇÕES DE PERMISSÃO GRANULAR ---

function canManageRoles(member) {
  const managers = process.env.ROLE_MANAGER_IDS?.split(",") || [];
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some((r) => managers.includes(r.id))
  );
}

function canAssignRoles(member) {
  const assigners = process.env.ROLE_ASSIGNER_IDS?.split(",") || [];
  // Quem gerencia também pode atribuir
  return (
    canManageRoles(member) ||
    member.roles.cache.some((r) => assigners.includes(r.id))
  );
}

module.exports = {
  // Exporta IDs para o roteador saber que a interação é daqui
  BTN,
  MDL,

  /**
   * Envia o Painel Visual
   */
  sendRolePanel: async (message) => {
    // Apenas quem pode atribuir ou gerenciar vê o painel
    if (!canAssignRoles(message.member)) {
      return message.reply({
        content: "🔒 Você não tem acesso ao Painel de Cargos.",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📇 Central de Gestão de Cargos")
      .setDescription(
        "Gerencie a hierarquia e atribuições do servidor através deste painel seguro.\n\n" +
          "🔹 **Linha 1 (Gestão):** Criar, Editar e Excluir cargos do servidor.\n" +
          "🔸 **Linha 2 (Operação):** Dar ou Remover cargos de membros."
      )
      .setColor(0x5865f2)
      .addFields({
        name: "👮 Seu Nível de Acesso",
        value: canManageRoles(message.member)
          ? "✅ Gestor (Acesso Total)"
          : "⚠️ Operacional (Apenas Atribuição)",
        inline: false,
      })
      .setThumbnail(message.guild.iconURL())
      .setFooter({ text: "Sistema Zero Trust • Todas as ações são logadas." });

    // Linha 1: Gestão (Criar/Editar/Excluir)
    const rowManagement = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.CREATE)
        .setLabel("Criar Cargo")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✨")
        .setDisabled(!canManageRoles(message.member)),
      new ButtonBuilder()
        .setCustomId(BTN.EDIT)
        .setLabel("Editar Cargo")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✏️")
        .setDisabled(!canManageRoles(message.member)),
      new ButtonBuilder()
        .setCustomId(BTN.DELETE)
        .setLabel("Excluir Cargo")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
        .setDisabled(!canManageRoles(message.member))
    );

    // Linha 2: Operação (Dar/Tirar)
    const rowOperation = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.ADD)
        .setLabel("Adicionar a Membro")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId(BTN.REM)
        .setLabel("Remover de Membro")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➖")
    );

    await message.channel.send({
      embeds: [embed],
      components: [rowManagement, rowOperation],
    });
  },

  /**
   * Processa cliques e modais
   */
  handleRoleInteractions: async (interaction) => {
    const { customId } = interaction;
    const isButton = interaction.isButton();
    const isModal = interaction.isModalSubmit();
    const guild = interaction.guild;

    // --- BOTÕES: ABREM OS MODAIS ---
    if (isButton) {
      if (customId === BTN.CREATE) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({
            content: "🔒 Acesso negado.",
            ephemeral: true,
          });
        const modal = new ModalBuilder()
          .setCustomId(MDL.CREATE)
          .setTitle("Criar Novo Cargo");
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_name")
              .setLabel("Nome do Cargo")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_color")
              .setLabel("Cor Hex (Ex: #FF0000)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("#99AAB5")
              .setRequired(false)
          )
        );
        return interaction.showModal(modal);
      }

      if (customId === BTN.EDIT) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({
            content: "🔒 Acesso negado.",
            ephemeral: true,
          });
        const modal = new ModalBuilder()
          .setCustomId(MDL.EDIT)
          .setTitle("Editar Cargo Existente");
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_id")
              .setLabel("ID do Cargo ou Nome Exato")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_newname")
              .setLabel("Novo Nome (Deixe vazio p/ manter)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_newcolor")
              .setLabel("Nova Cor (Deixe vazio p/ manter)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );
        return interaction.showModal(modal);
      }

      if (customId === BTN.DELETE) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({
            content: "🔒 Acesso negado.",
            ephemeral: true,
          });
        const modal = new ModalBuilder()
          .setCustomId(MDL.DELETE)
          .setTitle("Excluir Cargo");
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_id")
              .setLabel("ID do Cargo ou Nome Exato")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      if (customId === BTN.ADD || customId === BTN.REM) {
        if (!canAssignRoles(interaction.member))
          return interaction.reply({
            content: "🔒 Acesso negado.",
            ephemeral: true,
          });
        const action = customId === BTN.ADD ? "Adicionar" : "Remover";
        const modalId = customId === BTN.ADD ? MDL.ADD : MDL.REM;

        const modal = new ModalBuilder()
          .setCustomId(modalId)
          .setTitle(`${action} Cargo`);
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("u_id")
              .setLabel("ID do Usuário ou @Menção")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_id")
              .setLabel("Nome do Cargo ou ID")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }
    }

    // --- MODAIS: PROCESSAM A LÓGICA ---
    if (isModal) {
      await interaction.deferReply({ ephemeral: true });
      const logChannelId = interaction.client.config.LOG_CHANNEL_ID;

      // 1. CRIAR
      if (customId === MDL.CREATE) {
        const name = interaction.fields.getTextInputValue("r_name");
        const color =
          interaction.fields.getTextInputValue("r_color") || "#99AAB5";

        try {
          const role = await guild.roles.create({
            name,
            color,
            reason: `Criado via Painel por ${interaction.user.tag}`,
          });
          await logEmbed(
            interaction.client,
            logChannelId,
            "Cargo Criado",
            `**${role.name}** criado por <@${interaction.user.id}>`,
            0x00ff00
          );
          return interaction.editReply(`✅ Cargo ${role} criado com sucesso!`);
        } catch (e) {
          return interaction.editReply(`❌ Erro: ${e.message}`);
        }
      }

      // 2. EDITAR
      if (customId === MDL.EDIT) {
        const roleRef = interaction.fields.getTextInputValue("r_id");
        const name = interaction.fields.getTextInputValue("r_newname");
        const color = interaction.fields.getTextInputValue("r_newcolor");

        const role =
          guild.roles.cache.get(roleRef) ||
          guild.roles.cache.find((r) => r.name === roleRef);
        if (!role) return interaction.editReply("❌ Cargo não encontrado.");
        if (role.position >= guild.members.me.roles.highest.position)
          return interaction.editReply("❌ Cargo superior ao meu.");

        try {
          await role.edit({
            name: name.length > 0 ? name : role.name,
            color: color.length > 0 ? color : role.color,
            reason: `Editado via Painel por ${interaction.user.tag}`,
          });
          await logEmbed(
            interaction.client,
            logChannelId,
            "Cargo Editado",
            `**${role.name}** editado por <@${interaction.user.id}>`,
            0xf1c40f
          );
          return interaction.editReply(`✅ Cargo **${role.name}** atualizado.`);
        } catch (e) {
          return interaction.editReply(`❌ Erro: ${e.message}`);
        }
      }

      // 3. DELETAR
      if (customId === MDL.DELETE) {
        const roleRef = interaction.fields.getTextInputValue("r_id");
        const role =
          guild.roles.cache.get(roleRef) ||
          guild.roles.cache.find((r) => r.name === roleRef);

        if (!role) return interaction.editReply("❌ Cargo não encontrado.");
        if (role.position >= guild.members.me.roles.highest.position)
          return interaction.editReply("❌ Cargo superior ao meu.");

        const roleName = role.name;
        try {
          await role.delete(`Deletado via Painel por ${interaction.user.tag}`);
          await logEmbed(
            interaction.client,
            logChannelId,
            "Cargo Excluído",
            `**${roleName}** foi deletado por <@${interaction.user.id}>`,
            0xff0000
          );
          return interaction.editReply(`🗑️ Cargo **${roleName}** deletado.`);
        } catch (e) {
          return interaction.editReply(`❌ Erro: ${e.message}`);
        }
      }

      // 4. ATRIBUIR / REMOVER DE MEMBRO
      if (customId === MDL.ADD || customId === MDL.REM) {
        const userRef = interaction.fields
          .getTextInputValue("u_id")
          .replace(/<@!?(\d+)>/, "$1");
        const roleRef = interaction.fields
          .getTextInputValue("r_id")
          .replace(/<@&(\d+)>/, "$1");
        const isAdd = customId === MDL.ADD;

        const member = await guild.members.fetch(userRef).catch(() => null);
        const role =
          guild.roles.cache.get(roleRef) ||
          guild.roles.cache.find((r) => r.name === roleRef);

        if (!member) return interaction.editReply("❌ Usuário não encontrado.");
        if (!role) return interaction.editReply("❌ Cargo não encontrado.");
        if (role.position >= guild.members.me.roles.highest.position)
          return interaction.editReply("❌ Cargo superior ao meu.");

        try {
          if (isAdd) {
            await member.roles.add(role);
            await logEmbed(
              interaction.client,
              logChannelId,
              "Cargo Atribuído",
              `<@${interaction.user.id}> deu **${role.name}** para <@${member.id}>`,
              0x00ff00
            );
            return interaction.editReply(
              `✅ Cargo **${role.name}** adicionado a **${member.user.tag}**.`
            );
          } else {
            await member.roles.remove(role);
            await logEmbed(
              interaction.client,
              logChannelId,
              "Cargo Removido",
              `<@${interaction.user.id}> tirou **${role.name}** de <@${member.id}>`,
              0xff0000
            );
            return interaction.editReply(
              `🗑️ Cargo **${role.name}** removido de **${member.user.tag}**.`
            );
          }
        } catch (e) {
          return interaction.editReply(`❌ Erro: ${e.message}`);
        }
      }
    }
  },
};
