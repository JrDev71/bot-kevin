// handlers/boosterHandler.js
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");

// Importa gerenciador de dados e IDs dos botões
const {
  getBoosterData,
  updateBoosterData,
  addBoosterFriend,
} = require("../boosterManager");
const { BTN_TAG, BTN_CHANNEL, BTN_ADD } = require("../commands/booster");

// IDs Internos dos Modais
const MDL_TAG = "boost_mdl_tag";
const MDL_CHANNEL = "boost_mdl_ch";
const MDL_ADD = "boost_mdl_add";

// CONFIG VISUAL (Nitro Pink para diferenciar, mas mantendo o estilo dark)
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443770029354127451/banner-vip-booster.png?ex=692a471e&is=6928f59e&hm=2dc7967ad2cde87a2a4bc015e97d7abbc75362ab40f798fb7949c6d32fdf7dda";
const COLOR_NITRO = 0xf47fff;

// Helper de Resposta
const reply = (interaction, desc) => {
  const embed = new EmbedBuilder()
    .setDescription(desc)
    .setColor(COLOR_NITRO)
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
    [BTN_TAG, BTN_CHANNEL, BTN_ADD].includes(interaction.customId)
  ) {
    if (interaction.customId === BTN_TAG) {
      const modal = new ModalBuilder()
        .setCustomId(MDL_TAG)
        .setTitle("Configurar Tag Booster");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("t_name")
            .setLabel("Nome")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("t_color")
            .setLabel("Cor Hex")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        )
      );
      await interaction.showModal(modal);
    } else if (interaction.customId === BTN_CHANNEL) {
      const modal = new ModalBuilder()
        .setCustomId(MDL_CHANNEL)
        .setTitle("Canal Booster");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("c_name")
            .setLabel("Nome (digite 'deletar' p/ apagar)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
      await interaction.showModal(modal);
    } else if (interaction.customId === BTN_ADD) {
      const modal = new ModalBuilder()
        .setCustomId(MDL_ADD)
        .setTitle("Adicionar Amigo");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("f_id")
            .setLabel("ID do Amigo")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
      await interaction.showModal(modal);
    }
    return true;
  }

  // 2. PROCESSAR MODAIS
  if (
    isModal &&
    [MDL_TAG, MDL_CHANNEL, MDL_ADD].includes(interaction.customId)
  ) {
    await interaction.deferReply({ ephemeral: true });

    // Verifica se é booster mesmo
    if (!interaction.member.premiumSince)
      return reply(
        interaction,
        "<:Nao:1443642030637977743> Você precisa estar impulsionando o servidor."
      );

    const data = await getBoosterData(interaction.user.id);
    if (!data)
      return reply(interaction, "Erro ao carregar dados. Tente novamente.");

    // A. TAG
    if (interaction.customId === MDL_TAG) {
      const name = interaction.fields.getTextInputValue("t_name");
      const color =
        interaction.fields.getTextInputValue("t_color") || "#F47FFF";

      try {
        let role;
        if (data.customRoleId)
          role = await interaction.guild.roles
            .fetch(data.customRoleId)
            .catch(() => null);

        if (role) {
          await role.edit({ name, color });
          reply(
            interaction,
            `<:certo_froid:1443643346722754692> Tag editada para **${name}**!`
          );
        } else {
          // Pega a âncora de Boosters do .env
          const anchorId = process.env.BOOSTER_ANCHOR_ROLE_ID;
          const anchorRole = anchorId
            ? interaction.guild.roles.cache.get(anchorId)
            : null;
          const position = anchorRole ? anchorRole.position - 1 : 1;

          role = await interaction.guild.roles.create({
            name,
            color,
            position,
            reason: `Booster: ${interaction.user.tag}`,
          });

          await interaction.member.roles.add(role);
          await updateBoosterData(interaction.user.id, {
            customRoleId: role.id,
          });

          // Sincroniza canal se existir
          if (data.customChannelId) {
            const ch = await interaction.guild.channels
              .fetch(data.customChannelId)
              .catch(() => null);
            if (ch)
              await ch.permissionOverwrites.edit(role.id, {
                Connect: true,
                ViewChannel: true,
              });
          }
          reply(
            interaction,
            `<:certo_froid:1443643346722754692> Tag Booster **${name}** criada!`
          );
        }
      } catch (e) {
        reply(
          interaction,
          "<:Nao:1443642030637977743> Erro ao configurar tag. Verifique a hierarquia."
        );
      }
    }

    // B. CANAL
    else if (interaction.customId === MDL_CHANNEL) {
      const name = interaction.fields.getTextInputValue("c_name");
      const catId = process.env.BOOSTER_CATEGORY_ID; // Categoria específica dos Boosters

      if (name.toLowerCase() === "deletar") {
        if (data.customChannelId) {
          const ch = await interaction.guild.channels
            .fetch(data.customChannelId)
            .catch(() => null);
          if (ch) await ch.delete();
          await updateBoosterData(interaction.user.id, {
            customChannelId: null,
          });
          return reply(
            interaction,
            "<:vmc_lixeiraK:1443653159779041362> Canal deletado."
          );
        }
        return reply(interaction, "Você não tem canal.");
      }

      try {
        let channel;
        if (data.customChannelId)
          channel = await interaction.guild.channels
            .fetch(data.customChannelId)
            .catch(() => null);

        if (channel) {
          await channel.setName(name);
          reply(
            interaction,
            `<:certo_froid:1443643346722754692> Canal renomeado.`
          );
        } else {
          if (!catId)
            return reply(
              interaction,
              "<:am_avisoK:1443645307358544124> Categoria Booster não configurada no .env."
            );

          const overwrites = [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
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
          if (data.customRoleId)
            overwrites.push({
              id: data.customRoleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
              ],
            });

          channel = await interaction.guild.channels.create({
            name: name,
            type: ChannelType.GuildVoice,
            parent: catId,
            permissionOverwrites: overwrites,
          });
          await updateBoosterData(interaction.user.id, {
            customChannelId: channel.id,
          });
          reply(
            interaction,
            `<:certo_froid:1443643346722754692> Canal Booster criado!`
          );
        }
      } catch (e) {
        reply(interaction, "<:Nao:1443642030637977743> Erro ao criar canal.");
      }
    }

    // C. AMIGO
    else if (interaction.customId === MDL_ADD) {
      const friendId = interaction.fields.getTextInputValue("f_id");
      if (!data.customRoleId)
        return reply(
          interaction,
          "<:Nao:1443642030637977743> Crie sua tag primeiro."
        );

      const res = await addBoosterFriend(interaction.user.id, friendId);
      if (!res.success)
        return reply(interaction, `<:Nao:1443642030637977743> ${res.msg}`);

      const friend = await interaction.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (friend) {
        const role = await interaction.guild.roles
          .fetch(data.customRoleId)
          .catch(() => null);
        if (role) await friend.roles.add(role);
        reply(
          interaction,
          `<:certo_froid:1443643346722754692> **${friend.user.tag}** adicionado à sua Tag Booster!`
        );
      } else {
        reply(
          interaction,
          "<:Nao:1443642030637977743> Usuário não encontrado."
        );
      }
    }
    return true;
  }
  return false;
};
