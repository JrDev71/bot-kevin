// handlers/channelHandler.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionsBitField,
  ChannelSelectMenuBuilder,
} = require("discord.js");

const { BTN, MDL, SEL, CHANNEL_PRESETS } = require("../commands/channelPanel");
const logEmbed = require("../utils/logEmbed");

const MDL_CREATE = "mdl_ch_create";
const MDL_NAME_EDIT = "mdl_ch_rename";

module.exports = async (interaction) => {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();
  const isSelect = interaction.isAnySelectMenu();

  const trustedRoles = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  const isStaff =
    interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    ) ||
    interaction.member.roles.cache.some((r) => trustedRoles.includes(r.id));

  if (!isStaff && (isButton || isModal || isSelect)) {
    // Verificação simples de segurança
    if (interaction.customId.includes("_ch_"))
      return interaction.reply({
        content: "🔒 Acesso negado.",
        ephemeral: true,
      });
  }

  // --- BOTÕES ---
  if (isButton) {
    // 1. CRIAR
    if (interaction.customId === BTN.CREATE) {
      const modal = new ModalBuilder()
        .setCustomId(MDL_CREATE)
        .setTitle("Criar Infraestrutura");
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

    // 2. DELETAR (Agora inclui Categorias na lista)
    if (interaction.customId === BTN.DELETE) {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId(SEL.DEL)
        .setPlaceholder("Selecione Canal ou Categoria")
        .setChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildCategory
        ); // <--- ADICIONADO

      const row = new ActionRowBuilder().addComponents(menu);
      return interaction.reply({
        content: "Selecione para apagar:",
        components: [row],
        ephemeral: true,
      });
    }

    // 3. EDITAR (Agora inclui Categorias na lista)
    if (interaction.customId === BTN.EDIT) {
      const menu = new ChannelSelectMenuBuilder()
        .setCustomId(SEL.EDIT)
        .setPlaceholder("Selecione Canal ou Categoria")
        .setChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildCategory
        ); // <--- ADICIONADO

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
    // 1. PÓS-MODAL DE CRIAÇÃO -> SELETOR DE PRESET
    if (interaction.customId === MDL_CREATE) {
      const name = interaction.fields.getTextInputValue("c_name");
      const typeInput = interaction.fields
        .getTextInputValue("c_type")
        .toLowerCase();

      // Detecta o tipo baseado no texto
      let filterType = null;
      if (typeInput.includes("cat")) filterType = ChannelType.GuildCategory;
      else if (typeInput.includes("voz") || typeInput.includes("voice"))
        filterType = ChannelType.GuildVoice;
      else filterType = ChannelType.GuildText;

      // Filtra os presets disponíveis para esse tipo
      const options = Object.entries(CHANNEL_PRESETS)
        .filter(([_, data]) => data.type === filterType)
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

      if (options.length === 0)
        return interaction.reply({
          content: "Tipo inválido. Use: texto, voz ou categoria.",
          ephemeral: true,
        });

      // Passa o nome via cache ou customId (aqui usaremos um Select Menu com customId especial para simplificar, mas o ideal é Cache em prod)
      // Vamos usar o "truque" de passar o nome no reply e pedir pro usuario selecionar, guardando no SelectMenu não dá.
      // Vamos usar uma variável global temporária (Cuidado em produção com muito tráfego, mas para bot privado ok)
      // O ideal é usar `creationCache` como fizemos no rolePanel.

      // **IMPORTANTE**: Certifique-se de que `creationCache` está definido no escopo global deste arquivo.
      // Se não tiver, defina: const creationCache = new Map(); no topo.
      // Vou assumir que vou adicionar agora:

      const { StringSelectMenuBuilder } = require("discord.js"); // Certifique-se de importar

      // Armazena o nome temporariamente
      global.channelCreationCache = global.channelCreationCache || new Map();
      global.channelCreationCache.set(interaction.user.id, name);

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(SEL.TYPE)
          .setPlaceholder("Selecione o Modelo de Permissão")
          .addOptions(options)
      );

      await interaction.reply({
        content: `Criando: **${name}**. Escolha a permissão:`,
        components: [row],
        ephemeral: true,
      });
      return true;
    }

    // 2. RENOMEAR
    if (interaction.customId.startsWith(MDL.NAME_EDIT)) {
      await interaction.deferReply({ ephemeral: true });
      const channelId = interaction.customId.split("_").pop();
      const newName = interaction.fields.getTextInputValue("c_newname");
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) return interaction.editReply("Não encontrado.");

      try {
        await channel.setName(newName);
        interaction.editReply(`✅ Renomeado para **${newName}**`);

        // Log
        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        const logEmbed = require("../utils/logEmbed");
        await logEmbed(
          interaction.client,
          logChannelId,
          "Infra Editada",
          `**${newName}** (ID: ${channel.id}) editado por <@${interaction.user.id}>`,
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
    // A. FINALIZAR CRIAÇÃO
    if (interaction.customId === SEL.TYPE) {
      await interaction.deferUpdate();
      const presetKey = interaction.values[0];
      const preset = CHANNEL_PRESETS[presetKey];
      const name = global.channelCreationCache?.get(interaction.user.id);

      if (!name)
        return interaction.editReply({
          content: "Tempo esgotado.",
          components: [],
        });

      try {
        const overwrites = preset.overwrites(interaction.guild);
        // Staff sempre vê
        overwrites.push({
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.ManageChannels,
          ],
        });

        const ch = await interaction.guild.channels.create({
          name: name,
          type: preset.type,
          permissionOverwrites: overwrites,
        });

        global.channelCreationCache.delete(interaction.user.id);
        interaction.editReply({
          content: `✅ **${name}** criado!`,
          components: [],
        });

        // Log
        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        const logEmbed = require("../utils/logEmbed");
        await logEmbed(
          interaction.client,
          logChannelId,
          "Infra Criada",
          `**${ch.name}** (${preset.label}) por <@${interaction.user.id}>`,
          0x00ff00
        );
      } catch (e) {
        interaction.editReply({
          content: `Erro: ${e.message}`,
          components: [],
        });
      }
      return true;
    }

    // B. DELETAR
    if (interaction.customId === SEL.DEL) {
      await interaction.deferUpdate();
      const channelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) return interaction.editReply("Não encontrado.");

      const name = channel.name;
      const typeName =
        channel.type === ChannelType.GuildCategory ? "Categoria" : "Canal";

      // Se for categoria, avisa que os canais dentro podem ficar órfãos (o Discord não apaga os filhos automaticamente, eles só perdem a pasta)

      try {
        await channel.delete();
        interaction.editReply({
          content: `🗑️ ${typeName} **${name}** deletado.`,
          components: [],
        });

        const logChannelId = interaction.client.config.CHANNEL_UPDATE_LOG_ID;
        const logEmbed = require("../utils/logEmbed");
        await logEmbed(
          interaction.client,
          logChannelId,
          "Infra Deletada",
          `**${name}** (${typeName}) por <@${interaction.user.id}>`,
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

    // C. EDITAR (ABRE MODAL)
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
