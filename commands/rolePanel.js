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
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ComponentType,
} = require("discord.js");

const logEmbed = require("../utils/logEmbed");

// IDs dos Componentes
const BTN = {
  CREATE: "btn_rc",
  EDIT: "btn_re",
  DELETE: "btn_rd",
  ADD: "btn_ra",
  REM: "btn_rr",
};
const MDL = { CREATE: "mdl_rc", EDIT: "mdl_re" }; // Delete/Add/Rem agora usam menus
const SEL = {
  USER_ADD: "sel_u_add",
  USER_REM: "sel_u_rem",
  ROLE_ADD: "sel_r_add", // O sufixo será o ID do user
  ROLE_REM: "sel_r_rem",
  ROLE_DEL: "sel_r_del",
  ROLE_EDIT: "sel_r_edit",
};

// Permissões
function canManageRoles(member) {
  const managers = process.env.ROLE_MANAGER_IDS?.split(",") || [];
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some((r) => managers.includes(r.id))
  );
}
function canAssignRoles(member) {
  const assigners = process.env.ROLE_ASSIGNER_IDS?.split(",") || [];
  return (
    canManageRoles(member) ||
    member.roles.cache.some((r) => assigners.includes(r.id))
  );
}

module.exports = {
  // Envia o Painel
  sendRolePanel: async (message) => {
    if (!canAssignRoles(message.member)) return message.reply("🔒 Sem acesso.");

    const embed = new EmbedBuilder()
      .setTitle("📇 Gestão de Cargos (Interativo)")
      .setDescription(
        "Selecione uma ação. Agora você pode **selecionar** membros e cargos direto da lista!"
      )
      .setColor(0x5865f2)
      .addFields({
        name: "Nível",
        value: canManageRoles(message.member) ? "✅ Gestor" : "⚠️ Operacional",
      });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.CREATE)
        .setLabel("Criar")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✨")
        .setDisabled(!canManageRoles(message.member)),
      new ButtonBuilder()
        .setCustomId(BTN.EDIT)
        .setLabel("Editar")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✏️")
        .setDisabled(!canManageRoles(message.member)),
      new ButtonBuilder()
        .setCustomId(BTN.DELETE)
        .setLabel("Excluir")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
        .setDisabled(!canManageRoles(message.member))
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.ADD)
        .setLabel("Dar Cargo")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId(BTN.REM)
        .setLabel("Tirar Cargo")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➖")
    );

    await message.channel.send({ embeds: [embed], components: [row1, row2] });
  },

  // Handler de Interações
  handleRoleInteractions: async (interaction) => {
    const { customId } = interaction;
    const isButton = interaction.isButton();
    const isModal = interaction.isModalSubmit();
    const isSelect = interaction.isAnySelectMenu();
    const guild = interaction.guild;
    const logChannelId = interaction.client.config.LOG_CHANNEL_ID;

    // --- BOTÕES INICIAIS ---
    if (isButton) {
      // 1. CRIAR (Precisa de Nome, então continua sendo Modal)
      if (customId === BTN.CREATE) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({ content: "🔒 Negado.", ephemeral: true });
        const modal = new ModalBuilder()
          .setCustomId(MDL.CREATE)
          .setTitle("Criar Cargo");
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_name")
              .setLabel("Nome")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_color")
              .setLabel("Cor Hex")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );
        return interaction.showModal(modal);
      }

      // 2. EDITAR (Selecionar Cargo primeiro)
      if (customId === BTN.EDIT) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({ content: "🔒 Negado.", ephemeral: true });
        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(SEL.ROLE_EDIT)
            .setPlaceholder("Selecione o cargo para editar")
        );
        return interaction.reply({
          content: "Qual cargo você quer editar?",
          components: [row],
          ephemeral: true,
        });
      }

      // 3. DELETAR (Selecionar Cargo)
      if (customId === BTN.DELETE) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({ content: "🔒 Negado.", ephemeral: true });
        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(SEL.ROLE_DEL)
            .setPlaceholder("Selecione o cargo para EXCLUIR")
        );
        return interaction.reply({
          content: "⚠️ Qual cargo será deletado permanentemente?",
          components: [row],
          ephemeral: true,
        });
      }

      // 4. ADICIONAR/REMOVER (Selecionar Usuário Primeiro)
      if (customId === BTN.ADD || customId === BTN.REM) {
        if (!canAssignRoles(interaction.member))
          return interaction.reply({ content: "🔒 Negado.", ephemeral: true });
        const nextId = customId === BTN.ADD ? SEL.USER_ADD : SEL.USER_REM;
        const row = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(nextId)
            .setPlaceholder("Selecione o membro alvo")
        );
        return interaction.reply({
          content: `Selecione o membro para ${
            customId === BTN.ADD ? "dar" : "tirar"
          } cargo:`,
          components: [row],
          ephemeral: true,
        });
      }
    }

    // --- MENUS DE SELEÇÃO (Lógica em Cadeia) ---
    if (isSelect) {
      // A. SELECIONOU USUÁRIO -> AGORA MOSTRA MENU DE CARGOS
      if (customId === SEL.USER_ADD || customId === SEL.USER_REM) {
        const userId = interaction.values[0]; // Pega o ID do usuário selecionado
        const isAdd = customId === SEL.USER_ADD;
        // Truque: Passa o ID do usuário no customId do próximo menu para não perder a referência
        const nextId = isAdd
          ? `${SEL.ROLE_ADD}_${userId}`
          : `${SEL.ROLE_REM}_${userId}`;

        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(nextId)
            .setPlaceholder(`Qual cargo ${isAdd ? "adicionar" : "remover"}?`)
        );

        return interaction.update({
          content: `Membro selecionado: <@${userId}>.\nAgora, selecione o cargo:`,
          components: [row],
        });
      }

      // B. SELECIONOU CARGO (FINALIZAÇÃO DA ATRIBUIÇÃO)
      if (
        customId.startsWith(SEL.ROLE_ADD) ||
        customId.startsWith(SEL.ROLE_REM)
      ) {
        await interaction.deferUpdate();
        const roleId = interaction.values[0];
        const userId = customId.split("_").pop(); // Recupera o ID do usuário do customId
        const isAdd = customId.startsWith(SEL.ROLE_ADD);

        const member = await guild.members.fetch(userId).catch(() => null);
        const role = guild.roles.cache.get(roleId);

        if (!member || !role)
          return interaction.editReply({
            content: "❌ Erro: Usuário ou Cargo não encontrado.",
            components: [],
          });
        if (role.position >= guild.members.me.roles.highest.position)
          return interaction.editReply({
            content: "❌ Não posso gerenciar esse cargo (hierarquia).",
            components: [],
          });

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
            return interaction.editReply({
              content: `✅ Cargo **${role.name}** adicionado a **${member.user.tag}**!`,
              components: [],
            });
          } else {
            await member.roles.remove(role);
            await logEmbed(
              interaction.client,
              logChannelId,
              "Cargo Removido",
              `<@${interaction.user.id}> tirou **${role.name}** de <@${member.id}>`,
              0xff0000
            );
            return interaction.editReply({
              content: `🗑️ Cargo **${role.name}** removido de **${member.user.tag}**.`,
              components: [],
            });
          }
        } catch (e) {
          return interaction.editReply({
            content: `❌ Erro: ${e.message}`,
            components: [],
          });
        }
      }

      // C. SELECIONOU CARGO PARA DELETAR
      if (customId === SEL.ROLE_DEL) {
        await interaction.deferUpdate();
        const roleId = interaction.values[0];
        const role = guild.roles.cache.get(roleId);

        if (!role)
          return interaction.editReply({
            content: "Cargo não existe.",
            components: [],
          });
        if (role.position >= guild.members.me.roles.highest.position)
          return interaction.editReply({
            content: "❌ Hierarquia insuficiente.",
            components: [],
          });

        try {
          const name = role.name;
          await role.delete(`Painel por ${interaction.user.tag}`);
          await logEmbed(
            interaction.client,
            logChannelId,
            "Cargo Excluído",
            `**${name}** deletado por <@${interaction.user.id}>`,
            0xff0000
          );
          return interaction.editReply({
            content: `🗑️ Cargo **${name}** deletado.`,
            components: [],
          });
        } catch (e) {
          return interaction.editReply({
            content: `Erro: ${e.message}`,
            components: [],
          });
        }
      }

      // D. SELECIONOU CARGO PARA EDITAR -> ABRE MODAL
      if (customId === SEL.ROLE_EDIT) {
        // Select Menu não pode abrir Modal diretamente se já foi deferred/updated...
        // Mas aqui estamos no primeiro reply do select. O Discord exige que Modal seja resposta a interação.
        // Truque: Modal tem que ser a resposta direta.
        const roleId = interaction.values[0];
        const role = guild.roles.cache.get(roleId);
        if (!role)
          return interaction.reply({
            content: "Cargo sumiu.",
            ephemeral: true,
          });

        // Precisamos abrir o modal agora.
        const modal = new ModalBuilder()
          .setCustomId(`${MDL.EDIT}_${roleId}`)
          .setTitle(`Editar: ${role.name.slice(0, 20)}`);
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_newname")
              .setLabel("Novo Nome")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(role.name)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("r_newcolor")
              .setLabel("Nova Cor")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(role.hexColor)
          )
        );
        return interaction.showModal(modal);
      }
    }

    // --- MODAIS (CRIAR E EDITAR) ---
    if (isModal) {
      await interaction.deferReply({ ephemeral: true });

      if (customId === MDL.CREATE) {
        const name = interaction.fields.getTextInputValue("r_name");
        const color =
          interaction.fields.getTextInputValue("r_color") || "#99AAB5";
        try {
          const role = await guild.roles.create({
            name,
            color,
            reason: `Painel: ${interaction.user.tag}`,
          });
          await logEmbed(
            interaction.client,
            logChannelId,
            "Cargo Criado",
            `**${role.name}** por <@${interaction.user.id}>`,
            0x00ff00
          );
          return interaction.editReply(`✅ Cargo **${role.name}** criado!`);
        } catch (e) {
          return interaction.editReply(`Erro: ${e.message}`);
        }
      }

      if (customId.startsWith(MDL.EDIT)) {
        const roleId = customId.split("_").pop();
        const role = guild.roles.cache.get(roleId);
        const name = interaction.fields.getTextInputValue("r_newname");
        const color = interaction.fields.getTextInputValue("r_newcolor");

        if (!role) return interaction.editReply("Cargo não encontrado.");
        try {
          await role.edit({
            name: name || role.name,
            color: color || role.color,
          });
          await logEmbed(
            interaction.client,
            logChannelId,
            "Cargo Editado",
            `**${role.name}** editado por <@${interaction.user.id}>`,
            0xf1c40f
          );
          return interaction.editReply(`✅ Cargo atualizado!`);
        } catch (e) {
          return interaction.editReply(`Erro: ${e.message}`);
        }
      }
    }
  },
};
