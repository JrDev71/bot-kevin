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
  StringSelectMenuBuilder,
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
const MDL = { CREATE: "mdl_rc", EDIT: "mdl_re" };
const SEL = {
  USER_ADD: "sel_u_add",
  USER_REM: "sel_u_rem",
  ROLE_ADD: "sel_r_add",
  ROLE_REM: "sel_r_rem",
  ROLE_DEL: "sel_r_del",
  ROLE_EDIT: "sel_r_edit",
  PERM_LEVEL: "sel_perm_level",
};

// CONFIG VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

// --- PRESETS DE SEGURANÇA ---
const PERM_PRESETS = {
  cosmetic: {
    label: "🎨 Cosmético",
    description: "Sem permissões extras. Apenas cor e destaque.",
    perms: [],
  },
  member: {
    label: "👤 Membro Padrão",
    description: "Ver canais, falar, conectar, mudar apelido.",
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
    description: "Mover membros em call, Prioridade de voz.",
    perms: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
      PermissionsBitField.Flags.MoveMembers,
      PermissionsBitField.Flags.PrioritySpeaker,
    ],
  },
  mod: {
    label: "🛡️ Moderador",
    description: "Timeout (Castigo), Gerenciar Msgs, Expulsar.",
    perms: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
      PermissionsBitField.Flags.MoveMembers,
      PermissionsBitField.Flags.ModerateMembers,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.MuteMembers,
      PermissionsBitField.Flags.DeafenMembers,
    ],
  },
  admin: {
    label: "⚙️ Administrador (Seguro)",
    description: "Banir, Gerenciar Canais/Cargos (Sem a flag Administrator).",
    perms: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ModerateMembers,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ViewAuditLog,
    ],
  },
};

// Cache temporário para criação (Nome/Cor)
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
  SEL,

  // Função de Envio do Painel
  sendRolePanel: async (message) => {
    if (!canAssignRoles(message.member))
      return message.reply("<:cadeado:1443642375833518194> Acesso negado.");

    const embed = new EmbedBuilder()
      .setTitle("Gestão de Cargos")
      .setDescription(
        "Painel administrativo para controle de hierarquia e atribuições.\nSelecione uma ação abaixo."
      )
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE)
      .addFields({
        name: "Seu Nível",
        value: canManageRoles(message.member)
          ? "<:certo_froid:1443643346722754692> Gestor Total"
          : "<:am_avisoK:1443645307358544124> Operacional (Apenas Atribuição)",
      });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.CREATE)
        .setLabel("Criar Novo")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✨")
        .setDisabled(!canManageRoles(message.member)),
      new ButtonBuilder()
        .setCustomId(BTN.EDIT)
        .setLabel("Editar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️")
        .setDisabled(!canManageRoles(message.member)),
      new ButtonBuilder()
        .setCustomId(BTN.DELETE)
        .setLabel("Excluir")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:vmc_lixeiraK:1443653159779041362>")
        .setDisabled(!canManageRoles(message.member))
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN.ADD)
        .setLabel("Atribuir a Membro")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId(BTN.REM)
        .setLabel("Remover de Membro")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➖")
    );

    await message.channel.send({ embeds: [embed], components: [row1, row2] });
    if (message.deletable) message.delete().catch(() => {});
  },

  // Handler de Interações
  handleRoleInteractions: async (interaction) => {
    const { customId } = interaction;
    const isButton = interaction.isButton();
    const isModal = interaction.isModalSubmit();
    const isSelect = interaction.isAnySelectMenu();
    const guild = interaction.guild;
    const logChannelId = interaction.client.config.LOG_CHANNEL_ID;

    // Helper de Resposta Visual
    const replyEmbed = (title, desc) => {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(COLOR_NEUTRAL)
            .setImage(HEADER_IMAGE)
            .setTimestamp(),
        ],
        components: [],
      });
    };

    // --- BOTÕES ---
    if (isButton) {
      if (customId === BTN.CREATE) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({
            content: "<:cadeado:1443642375833518194> Negado.",
            ephemeral: true,
          });
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
              .setPlaceholder("#99AAB5")
              .setRequired(false)
          )
        );
        return interaction.showModal(modal);
      }

      if (customId === BTN.EDIT) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({
            content: "<:cadeado:1443642375833518194> Negado.",
            ephemeral: true,
          });
        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(SEL.ROLE_EDIT)
            .setPlaceholder("Selecione o cargo para editar")
        );
        return interaction.reply({
          content: "Selecione o cargo:",
          components: [row],
          ephemeral: true,
        });
      }

      if (customId === BTN.DELETE) {
        if (!canManageRoles(interaction.member))
          return interaction.reply({
            content: "<:cadeado:1443642375833518194> Negado.",
            ephemeral: true,
          });
        const row = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(SEL.ROLE_DEL)
            .setPlaceholder("Selecione o cargo para EXCLUIR")
        );
        return interaction.reply({
          content:
            "<:am_avisoK:1443645307358544124> Ação irreversível. Selecione o cargo:",
          components: [row],
          ephemeral: true,
        });
      }

      if (customId === BTN.ADD || customId === BTN.REM) {
        if (!canAssignRoles(interaction.member))
          return interaction.reply({
            content: "<:cadeado:1443642375833518194> Negado.",
            ephemeral: true,
          });
        const nextId = customId === BTN.ADD ? SEL.USER_ADD : SEL.USER_REM;
        const row = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(nextId)
            .setPlaceholder("Selecione o membro alvo")
        );
        return interaction.reply({
          content: `Selecione o membro:`,
          components: [row],
          ephemeral: true,
        });
      }
    }

    // --- MODAL (DADOS INICIAIS DA CRIAÇÃO) ---
    if (isModal && customId === MDL.CREATE) {
      const name = interaction.fields.getTextInputValue("r_name");
      const color =
        interaction.fields.getTextInputValue("r_color") || "#99AAB5";

      // Salva no cache e pede permissões
      creationCache.set(interaction.user.id, { name, color });

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
        content: `📝 **${name}**\nEscolha o modelo de segurança:`,
        components: [row],
      });
    }

    // --- MODAL (EDIÇÃO FINAL) ---
    if (isModal && customId.startsWith(MDL.EDIT)) {
      await interaction.deferReply({ ephemeral: true });
      const roleId = customId.split("_").pop();
      const role = guild.roles.cache.get(roleId);
      const name = interaction.fields.getTextInputValue("r_newname");
      const color = interaction.fields.getTextInputValue("r_newcolor");

      if (!role) return replyEmbed("Erro", "Cargo não encontrado.");
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
        return replyEmbed(
          "Sucesso",
          `<:certo_froid:1443643346722754692> Cargo atualizado.`
        );
      } catch (e) {
        return replyEmbed("Erro", `Falha: ${e.message}`);
      }
    }

    // --- SELETORES ---
    if (isSelect) {
      // 1. CRIAÇÃO FINAL (PRESET)
      if (customId === SEL.PERM_LEVEL) {
        await interaction.deferUpdate();
        const presetKey = interaction.values[0];
        const preset = PERM_PRESETS[presetKey];
        const data = creationCache.get(interaction.user.id);

        if (!data)
          return replyEmbed("Erro", "Tempo esgotado. Tente novamente.");

        try {
          const role = await guild.roles.create({
            name: data.name,
            color: data.color,
            permissions: preset.perms,
            reason: `Painel (${preset.label}) por ${interaction.user.tag}`,
          });
          creationCache.delete(interaction.user.id);
          await logEmbed(
            interaction.client,
            logChannelId,
            "Cargo Criado",
            `**${role.name}** (${preset.label}) criado por <@${interaction.user.id}>`,
            0x00ff00
          );
          return replyEmbed(
            "Sucesso",
            `<:certo_froid:1443643346722754692> Cargo **${role.name}** criado!\n<:cadeado:1443642375833518194> Nível: ${preset.label}`
          );
        } catch (e) {
          return replyEmbed("Erro", `Falha: ${e.message}`);
        }
      }

      // 2. SELEÇÃO DE USUÁRIO (ENCADEAMENTO)
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
          content: `Membro: <@${userId}>. Agora selecione o cargo:`,
          components: [row],
        });
      }

      // 3. ATRIBUIÇÃO FINAL
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
          return replyEmbed("Erro", "Usuário ou Cargo não encontrado.");
        if (role.position >= guild.members.me.roles.highest.position)
          return replyEmbed("Erro", "Cargo superior ao meu.");

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
            return replyEmbed(
              "Sucesso",
              `<:certo_froid:1443643346722754692> Cargo **${role.name}** adicionado a **${member.user.tag}**.`
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
            return replyEmbed(
              "Sucesso",
              `<:vmc_lixeiraK:1443653159779041362> Cargo **${role.name}** removido de **${member.user.tag}**.`
            );
          }
        } catch (e) {
          return replyEmbed("Erro", `Falha: ${e.message}`);
        }
      }

      // 4. DELETAR CARGO
      if (customId === SEL.ROLE_DEL) {
        await interaction.deferUpdate();
        const roleId = interaction.values[0];
        const role = guild.roles.cache.get(roleId);

        if (!role) return replyEmbed("Erro", "Cargo não existe.");
        if (role.position >= guild.members.me.roles.highest.position)
          return replyEmbed("Erro", "Hierarquia insuficiente.");

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
          return replyEmbed(
            "Sucesso",
            `<:vmc_lixeiraK:1443653159779041362> Cargo **${name}** deletado.`
          );
        } catch (e) {
          return replyEmbed("Erro", `Falha: ${e.message}`);
        }
      }

      // 5. EDITAR (ABRE MODAL)
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

    return false;
  },
};
