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
  StringSelectMenuBuilder, // NOVO: Para selecionar o nível de permissão
} = require("discord.js");

const logEmbed = require("../utils/logEmbed");

// --- CONFIGURAÇÃO DE MODELOS DE PERMISSÃO ---
const PERM_PRESETS = {
  cosmetic: {
    label: "🎨 Cosmético (Sem permissões)",
    description: "Apenas para cor/enfeite. Não vê canais extras.",
    perms: [], // Nenhuma permissão específica (herda @everyone)
  },
  member: {
    label: "👤 Membro Padrão",
    description: "Ver canais, falar, conectar em voz, mudar apelido.",
    perms: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
      PermissionsBitField.Flags.ChangeNickname,
    ],
  },
  helper: {
    label: "🤝 Suporte / Helper",
    description: "Membro + Mover em call, Prioridade de voz.",
    perms: [
      // Inclui as de membro...
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
      // Extras
      PermissionsBitField.Flags.MoveMembers,
      PermissionsBitField.Flags.PrioritySpeaker,
    ],
  },
  mod: {
    label: "🛡️ Moderador (Seguro)",
    description: "Helper + Castigo (Timeout), Gerenciar Msgs, Kick.",
    perms: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
      PermissionsBitField.Flags.MoveMembers,
      // Poderes de Mod
      PermissionsBitField.Flags.ModerateMembers, // Timeout
      PermissionsBitField.Flags.ManageMessages, // Apagar msg
      PermissionsBitField.Flags.KickMembers, // Expulsar
      PermissionsBitField.Flags.MuteMembers,
      PermissionsBitField.Flags.DeafenMembers,
    ],
  },
  admin: {
    label: "⚙️ Admin (Semi-Deus)",
    description: "Mod + Banir + Gerenciar Canais/Cargos. (SEM ADMINISTRATOR)",
    perms: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ModerateMembers,
      PermissionsBitField.Flags.ManageMessages,
      // Poderes Altos
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ManageRoles, // Cuidado: só mexe abaixo dele
      PermissionsBitField.Flags.ViewAuditLog,
    ],
  },
};

// IDs dos Componentes
const BTN = {
  CREATE: "btn_rc",
  EDIT: "btn_re",
  DELETE: "btn_rd",
  ADD: "btn_ra",
  REM: "btn_rr",
};
const MDL = { CREATE: "mdl_rc", EDIT: "mdl_re" };
const SEL = {
  USER_ADD: "sel_u_add",
  USER_REM: "sel_u_rem",
  ROLE_ADD: "sel_r_add",
  ROLE_REM: "sel_r_rem",
  ROLE_DEL: "sel_r_del",
  ROLE_EDIT: "sel_r_edit",
  PERM_LEVEL: "sel_perm_level", // NOVO
};

// Cache temporário para guardar Nome/Cor enquanto seleciona a permissão
const creationCache = new Map();

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
  BTN,
  MDL,
  SEL, // Exporta IDs

  sendRolePanel: async (message) => {
    if (!canAssignRoles(message.member)) return message.reply("🔒 Sem acesso.");

    const embed = new EmbedBuilder()
      .setTitle("📇 Gestão de Cargos (Zero Trust)")
      .setDescription(
        "Sistema seguro de criação e atribuição de cargos.\n\n**Modelos de Segurança:** Os cargos criados aqui seguem padrões rígidos de permissão."
      )
      .setColor(0x5865f2)
      .addFields({
        name: "Nível",
        value: canManageRoles(message.member) ? "✅ Gestor" : "⚠️ Operacional",
      });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.CREATE)
        .setLabel("Criar Novo")
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

  handleRoleInteractions: async (interaction) => {
    const { customId } = interaction;
    const isButton = interaction.isButton();
    const isModal = interaction.isModalSubmit();
    const isSelect = interaction.isAnySelectMenu();
    const guild = interaction.guild;
    const logChannelId = interaction.client.config.LOG_CHANNEL_ID;

    // --- BOTÕES ---
    if (isButton) {
      // 1. CRIAR (Abre Modal)
      if (customId === BTN.CREATE) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({ content: "🔒 Negado.", ephemeral: true });
        const modal = new ModalBuilder()
          .setCustomId(MDL.CREATE)
          .setTitle("Criar Novo Cargo");
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
              .setPlaceholder("#99AAB5")
              .setRequired(false)
          )
        );
        return interaction.showModal(modal);
      }
      // 2. EDITAR/DELETAR/ADD/REM (Lógica Mantida)
      if (customId === BTN.EDIT) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({ content: "🔒 Negado.", ephemeral: true });
        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(SEL.ROLE_EDIT)
            .setPlaceholder("Selecione o cargo")
        );
        return interaction.reply({
          content: "Qual cargo editar?",
          components: [row],
          ephemeral: true,
        });
      }
      if (customId === BTN.DELETE) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({ content: "🔒 Negado.", ephemeral: true });
        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(SEL.ROLE_DEL)
            .setPlaceholder("Selecione para EXCLUIR")
        );
        return interaction.reply({
          content: "⚠️ Qual cargo excluir?",
          components: [row],
          ephemeral: true,
        });
      }
      if (customId === BTN.ADD || customId === BTN.REM) {
        if (!canAssignRoles(interaction.member))
          return interaction.reply({ content: "🔒 Negado.", ephemeral: true });
        const nextId = customId === BTN.ADD ? SEL.USER_ADD : SEL.USER_REM;
        const row = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(nextId)
            .setPlaceholder("Selecione o membro")
        );
        return interaction.reply({
          content: `Selecione o membro:`,
          components: [row],
          ephemeral: true,
        });
      }
    }

    // --- MODAL (CRIAR) ---
    if (isModal && customId === MDL.CREATE) {
      const name = interaction.fields.getTextInputValue("r_name");
      const color =
        interaction.fields.getTextInputValue("r_color") || "#99AAB5";

      // Salva os dados temporariamente e pede o nível de permissão
      creationCache.set(interaction.user.id, { name, color });

      // Cria o Menu de Seleção de Permissões
      const options = Object.entries(PERM_PRESETS).map(([key, data]) => ({
        label: data.label,
        description: data.description,
        value: key,
      }));

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(SEL.PERM_LEVEL)
          .setPlaceholder("Selecione o Nível de Permissão")
          .addOptions(options)
      );

      await interaction.deferReply({ ephemeral: true });
      return interaction.editReply({
        content: `📝 Cargo: **${name}**\n🎨 Cor: **${color}**\n\nAgora, selecione as permissões que este cargo terá:`,
        components: [row],
      });
    }

    // --- MODAL (EDITAR - Finalização) ---
    if (isModal && customId.startsWith(MDL.EDIT)) {
      await interaction.deferReply({ ephemeral: true });
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
        return interaction.editReply(`✅ Cargo **${role.name}** atualizado.`);
      } catch (e) {
        return interaction.editReply(`❌ Erro: ${e.message}`);
      }
    }

    // --- SELETORES ---
    if (isSelect) {
      // 1. SELECIONOU O NÍVEL DE PERMISSÃO (CRIAÇÃO)
      if (customId === SEL.PERM_LEVEL) {
        await interaction.deferUpdate();
        const presetKey = interaction.values[0];
        const preset = PERM_PRESETS[presetKey];
        const data = creationCache.get(interaction.user.id);

        if (!data)
          return interaction.editReply({
            content: "⚠️ Tempo esgotado ou dados perdidos. Tente novamente.",
            components: [],
          });

        try {
          // Criação Segura do Cargo
          const role = await guild.roles.create({
            name: data.name,
            color: data.color,
            permissions: preset.perms, // Aplica o array de permissões seguro
            reason: `Painel (${preset.label}) por ${interaction.user.tag}`,
          });

          // Limpa cache e loga
          creationCache.delete(interaction.user.id);
          await logEmbed(
            interaction.client,
            logChannelId,
            "Cargo Criado",
            `**${role.name}** (Nível: ${presetKey}) criado por <@${interaction.user.id}>`,
            0x00ff00
          );

          return interaction.editReply({
            content: `✅ Cargo **${role.name}** criado com sucesso!\n🔒 Permissões: **${preset.label}**`,
            components: [],
          });
        } catch (e) {
          return interaction.editReply({
            content: `❌ Erro ao criar: ${e.message}`,
            components: [],
          });
        }
      }

      // 2. Lógica de Seleção de Usuário/Cargo (ADD/REM/EDIT/DEL)
      // ... (Mesma lógica do arquivo anterior) ...
      if (customId === SEL.USER_ADD || customId === SEL.USER_REM) {
        const userId = interaction.values[0];
        const isAdd = customId === SEL.USER_ADD;
        const nextId = isAdd
          ? `${SEL.ROLE_ADD}_${userId}`
          : `${SEL.ROLE_REM}_${userId}`;
        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(nextId)
            .setPlaceholder(`Qual cargo ${isAdd ? "adicionar" : "remover"}?`)
        );
        return interaction.update({
          content: `Membro: <@${userId}>. Selecione o cargo:`,
          components: [row],
        });
      }

      if (
        customId.startsWith(SEL.ROLE_ADD) ||
        customId.startsWith(SEL.ROLE_REM)
      ) {
        await interaction.deferUpdate();
        const roleId = interaction.values[0];
        const userId = customId.split("_").pop();
        const isAdd = customId.startsWith(SEL.ROLE_ADD);
        const member = await guild.members.fetch(userId).catch(() => null);
        const role = guild.roles.cache.get(roleId);

        if (!member || !role)
          return interaction.editReply({ content: "❌ Erro.", components: [] });
        if (role.position >= guild.members.me.roles.highest.position)
          return interaction.editReply({
            content: "❌ Hierarquia.",
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

      if (customId === SEL.ROLE_DEL) {
        await interaction.deferUpdate();
        const roleId = interaction.values[0];
        const role = guild.roles.cache.get(roleId);
        if (!role)
          return interaction.editReply({
            content: "Cargo sumiu.",
            components: [],
          });
        if (role.position >= guild.members.me.roles.highest.position)
          return interaction.editReply({
            content: "❌ Hierarquia.",
            components: [],
          });

        try {
          const name = role.name;
          await role.delete();
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

      if (customId === SEL.ROLE_EDIT) {
        const roleId = interaction.values[0];
        const role = guild.roles.cache.get(roleId);
        if (!role)
          return interaction.reply({
            content: "Cargo sumiu.",
            ephemeral: true,
          });
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
  },
};
