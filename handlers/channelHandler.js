// handlers/channelHandler.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionsBitField,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const { BTN, MDL, SEL, CHANNEL_PRESETS } = require("../commands/channelPanel");
const logEmbed = require("../utils/logEmbed");

const MDL_CREATE = "mdl_ch_create";
const MDL_NAME_EDIT = "mdl_ch_rename";

// Cache para guardar os dados enquanto o usuário navega pelos menus
// Formato: userId => { name: "Nome", type: ChannelType }
const creationCache = new Map();

module.exports = async (interaction) => {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();
  const isSelect = interaction.isAnySelectMenu();

  // Verificação de Segurança
  const trustedRoles = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  const isStaff =
    interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    ) ||
    interaction.member.roles.cache.some((r) => trustedRoles.includes(r.id));

  if (!isStaff && (isButton || isModal || isSelect)) {
    if (
      [
        BTN.CREATE,
        BTN.DELETE,
        BTN.EDIT,
        SEL.DEL,
        SEL.EDIT,
        SEL.TYPE,
        SEL.CAT,
      ].includes(interaction.customId)
    ) {
      return interaction.reply({
        content: "🔒 Acesso negado.",
        ephemeral: true,
      });
    }
  }

  // --- BOTÕES ---
  if (isButton) {
    // 1. CRIAR (Inicia o fluxo com Modal de Nome/Tipo)
    if (interaction.customId === BTN.CREATE) {
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
            .setLabel("Tipo")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("texto, voz ou categoria")
            .setRequired(true)
        )
      );
      return interaction.showModal(modal);
    }

    // 2. DELETAR
    if (interaction.customId === BTN.DELETE) {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId(SEL.DEL)
        .setPlaceholder("Selecione para DELETAR")
        .setChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildCategory
        );
      const row = new ActionRowBuilder().addComponents(menu);
      return interaction.reply({
        content: "Selecione o canal/categoria para apagar:",
        components: [row],
        ephemeral: true,
      });
    }

    // 3. EDITAR
    if (interaction.customId === BTN.EDIT) {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId(SEL.EDIT)
        .setPlaceholder("Selecione para EDITAR")
        .setChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildCategory
        );
      const row = new ActionRowBuilder().addComponents(menu);
      return interaction.reply({
        content: "Selecione para renomear:",
        components: [row],
        ephemeral: true,
      });
    }
  }

  // --- MODAIS ---
  if (isModal) {
    // 1. PÓS-MODAL: IDENTIFICAR TIPO E PEDIR CATEGORIA (SE NECESSÁRIO)
    if (interaction.customId === MDL_CREATE) {
      const name = interaction.fields.getTextInputValue("c_name");
      const typeInput = interaction.fields
        .getTextInputValue("c_type")
        .toLowerCase();

      let type = ChannelType.GuildText; // Default
      if (typeInput.includes("cat")) type = ChannelType.GuildCategory;
      else if (typeInput.includes("voz") || typeInput.includes("voice"))
        type = ChannelType.GuildVoice;

      // Salva no cache para usar nos próximos passos
      creationCache.set(interaction.user.id, { name, type });

      // SE FOR CATEGORIA: Pula direto para Permissões (Categorias não ficam dentro de categorias)
      if (type === ChannelType.GuildCategory) {
        return askForPermissions(interaction, type);
      }
      // SE FOR CANAL: Pergunta "Onde colocar?" (Menu de Categoria)
      else {
        const catMenu = new ChannelSelectMenuBuilder()
          .setCustomId(SEL.CAT)
          .setPlaceholder("Selecione a Categoria Pai (Onde o canal ficará)")
          .setChannelTypes(ChannelType.GuildCategory);

        const row = new ActionRowBuilder().addComponents(catMenu);
        await interaction.reply({
          content: `Nome: **${name}**. Agora, selecione a **Categoria** onde ele será criado:`,
          components: [row],
          ephemeral: true,
        });
        return true;
      }
    }

    // 2. RENOMEAR
    if (interaction.customId.startsWith(MDL.NAME_EDIT)) {
      await interaction.deferReply({ ephemeral: true });
      const channelId = interaction.customId.split("_").pop();
      const newName = interaction.fields.getTextInputValue("c_newname");
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) return interaction.editReply("Canal não existe.");

      try {
        await channel.setName(newName);
        interaction.editReply(`✅ Renomeado para **${newName}**`);
        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        await logEmbed(
          interaction.client,
          logChannelId,
          "Infra Editada",
          `**${newName}** editado por <@${interaction.user.id}>`,
          0xf1c40f
        );
      } catch (e) {
        interaction.editReply(`Erro: ${e.message}`);
      }
      return true;
    }
  }

  // --- SELETORES ---
  if (isSelect) {
    // A. SELECIONOU A CATEGORIA PAI -> AGORA PEDE PERMISSÃO
    if (interaction.customId === SEL.CAT) {
      const parentId = interaction.values[0];
      const cached = creationCache.get(interaction.user.id);

      if (!cached)
        return interaction.update({
          content: "Tempo esgotado. Comece de novo.",
          components: [],
        });

      // Atualiza o cache com o Pai escolhido
      cached.parentId = parentId;
      creationCache.set(interaction.user.id, cached);

      // Agora pede o tipo de permissão (Público, Staff, etc)
      return askForPermissions(interaction, cached.type, true); // true = é update da mensagem anterior
    }

    // B. SELECIONOU O PRESET (FINALIZAÇÃO)
    if (interaction.customId === SEL.TYPE) {
      await interaction.deferUpdate();
      const presetKey = interaction.values[0];
      const preset = CHANNEL_PRESETS[presetKey];
      const cached = creationCache.get(interaction.user.id);

      if (!cached)
        return interaction.editReply({
          content: "Tempo esgotado.",
          components: [],
        });

      try {
        const overwrites = preset.overwrites(interaction.guild);

        // Garante que quem criou (Staff) possa ver/gerenciar, mesmo se for privado
        overwrites.push({
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.ManageChannels,
          ],
        });

        const ch = await interaction.guild.channels.create({
          name: cached.name,
          type: preset.type,
          parent: cached.parentId, // Define a categoria pai (pode ser undefined se for Categoria)
          permissionOverwrites: overwrites,
        });

        creationCache.delete(interaction.user.id);
        interaction.editReply({
          content: `✅ **${cached.name}** criado com sucesso em **${preset.label}**!`,
          components: [],
        });

        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        await logEmbed(
          interaction.client,
          logChannelId,
          "Infra Criada",
          `**${ch.name}** (${preset.label}) por <@${interaction.user.id}>`,
          0x00ff00
        );
      } catch (e) {
        interaction.editReply({
          content: `❌ Erro ao criar: ${e.message}`,
          components: [],
        });
      }
      return true;
    }

    // C. DELETAR
    if (interaction.customId === SEL.DEL) {
      await interaction.deferUpdate();
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel)
        return interaction.editReply({
          content: "Não encontrado.",
          components: [],
        });

      try {
        const name = channel.name;
        await channel.delete();
        interaction.editReply({
          content: `🗑️ **${name}** deletado.`,
          components: [],
        });
        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        await logEmbed(
          interaction.client,
          logChannelId,
          "Infra Deletada",
          `**${name}** por <@${interaction.user.id}>`,
          0xff0000
        );
      } catch (e) {
        interaction.editReply({
          content: `Erro: ${e.message}`,
          components: [],
        });
      }
      return true;
    }

    // D. EDITAR (ABRE MODAL)
    if (interaction.customId === SEL.EDIT) {
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel)
        return interaction.reply({ content: "Sumiu.", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`${MDL_NAME_EDIT}_${channelId}`)
        .setTitle(`Renomear: ${channel.name.slice(0, 20)}`);
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

  return false;
};

// --- FUNÇÃO AUXILIAR PARA MOSTRAR MENU DE PRESETS ---
async function askForPermissions(interaction, type, isUpdate = false) {
  // Filtra os presets disponíveis para esse tipo de canal
  const options = Object.entries(CHANNEL_PRESETS)
    .filter(([_, data]) => data.type === type)
    .map(([key, data]) => ({
      label: data.label,
      description: data.description,
      value: key,
      emoji:
        data.type === ChannelType.GuildCategory
          ? "📂"
          : data.type === ChannelType.GuildVoice
          ? "🔊"
          : "💬",
    }));

  if (options.length === 0) {
    const msg = "Tipo inválido ou sem presets. Use: texto, voz ou categoria.";
    return isUpdate
      ? interaction.update({ content: msg, components: [] })
      : interaction.reply({ content: msg, ephemeral: true });
  }

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(SEL.TYPE)
      .setPlaceholder("Selecione o Modelo de Permissão")
      .addOptions(options)
  );

  const content =
    "Agora escolha o **Modelo de Permissão** (Quem pode ver/entrar):";
  return isUpdate
    ? interaction.update({ content, components: [row] })
    : interaction.reply({ content, components: [row], ephemeral: true });
}
