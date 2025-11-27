// handlers/vipHandler.js
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ButtonStyle,
} = require("discord.js");

const { getVipData, updateVipData, addFriend } = require("../vipManager");
const { BTN_TAG, BTN_CHANNEL, BTN_ADD_MEMBER } = require("../commands/vip");
const logEmbed = require("../utils/logEmbed");

// IDs Internos dos Modais
const MODAL_TAG = "vip_modal_tag";
const MODAL_CHANNEL = "vip_modal_channel";
const MODAL_ADD_USER = "vip_modal_add_user";

// CONFIG VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

// Helper para respostas padronizadas
const replyEmbed = (interaction, title, desc) => {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(COLOR_NEUTRAL)
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
            .setLabel("Nome (digite 'deletar' p/ apagar)")
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

  // 2. PROCESSAR MODAIS
  if (
    isModal &&
    [MODAL_TAG, MODAL_CHANNEL, MODAL_ADD_USER].includes(interaction.customId)
  ) {
    await interaction.deferReply({ ephemeral: true });

    // AWAIT OBRIGATÓRIO (Banco de Dados)
    const vipData = await getVipData(interaction.user.id);
    const logChannelId =
      interaction.client.config.PD_LOG_CHANNEL_ID ||
      interaction.client.config.LOG_CHANNEL_ID;

    if (!vipData)
      return replyEmbed(
        interaction,
        "Erro",
        "Você não possui um plano VIP ativo ou seus dados foram perdidos."
      );

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
          replyEmbed(
            interaction,
            "Sucesso",
            `<:certo_froid:1443643346722754692> Tag editada para **${tagName}**!`
          );
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
            reason: `VIP: ${interaction.user.tag}`,
          });

          const member = await interaction.guild.members.fetch(
            interaction.user.id
          );
          await member.roles.add(role);

          // AWAIT (Banco de Dados)
          await updateVipData(interaction.user.id, { customRoleId: role.id });

          // Sincroniza permissão do canal se já existir
          if (vipData.customChannelId) {
            const ch = await interaction.guild.channels
              .fetch(vipData.customChannelId)
              .catch(() => null);
            if (ch)
              await ch.permissionOverwrites.edit(role.id, {
                Connect: true,
                ViewChannel: true,
              });
          }
          replyEmbed(
            interaction,
            "Sucesso",
            `<:certo_froid:1443643346722754692> Tag **${tagName}** criada e vinculada!`
          );
        }
      } catch (e) {
        console.error(e);
        replyEmbed(
          interaction,
          "Erro",
          "Falha ao configurar tag. Verifique se meu cargo está acima da âncora."
        );
      }
    }

    // --- B. CONFIGURAR CANAL ---
    else if (interaction.customId === MODAL_CHANNEL) {
      const channelName = interaction.fields.getTextInputValue("channel_name");
      const categoryId = process.env.VIP_CATEGORY_ID;
      const verifiedRoleId = process.env.VERIFIED_ROLE_ID;

      // DELETAR CANAL
      if (channelName.toLowerCase() === "deletar") {
        if (vipData.customChannelId) {
          const ch = await interaction.guild.channels
            .fetch(vipData.customChannelId)
            .catch(() => null);
          if (ch) {
            await ch.delete();
            await updateVipData(interaction.user.id, { customChannelId: null }); // AWAIT
            return replyEmbed(
              interaction,
              "Sucesso",
              "<:vmc_lixeiraK:1443653159779041362> Canal deletado."
            );
          } else {
            await updateVipData(interaction.user.id, { customChannelId: null }); // AWAIT
            return replyEmbed(
              interaction,
              "Aviso",
              "Canal não encontrado, mas registro limpo."
            );
          }
        }
        return replyEmbed(
          interaction,
          "Erro",
          "Você não tem canal para deletar."
        );
      }

      try {
        let channel;
        if (vipData.customChannelId)
          channel = await interaction.guild.channels
            .fetch(vipData.customChannelId)
            .catch(() => null);

        if (channel) {
          await channel.setName(channelName);
          replyEmbed(
            interaction,
            "Sucesso",
            `<:certo_froid:1443643346722754692> Canal renomeado para **${channelName}**.`
          );
        } else {
          if (!categoryId)
            return replyEmbed(
              interaction,
              "Configuração",
              "<:am_avisoK:1443645307358544124> Categoria VIP não configurada no servidor."
            );

          // DEFINIÇÃO DE PERMISSÕES (Lógica que você pediu)
          const overwrites = [
            // Everyone: Não vê, não conecta
            {
              id: interaction.guild.id,
              deny: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
              ],
            },
            // Dono: Vê, conecta e gerencia
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.ManageChannels,
              ],
            },
          ];
          // Verificados: Veem, mas não conectam
          if (verifiedRoleId)
            overwrites.push({
              id: verifiedRoleId,
              allow: [PermissionsBitField.Flags.ViewChannel],
              deny: [PermissionsBitField.Flags.Connect],
            });
          // Amigos (Tag): Veem e conectam
          if (vipData.customRoleId)
            overwrites.push({
              id: vipData.customRoleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
              ],
            });

          channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: categoryId,
            permissionOverwrites: overwrites,
          });

          // AWAIT (Banco de Dados)
          await updateVipData(interaction.user.id, {
            customChannelId: channel.id,
          });
          replyEmbed(
            interaction,
            "Sucesso",
            `<:certo_froid:1443643346722754692> Canal **${channelName}** criado!`
          );
        }
      } catch (e) {
        replyEmbed(interaction, "Erro", "Falha ao criar canal.");
      }
    }

    // --- C. ADD AMIGO ---
    else if (interaction.customId === MODAL_ADD_USER) {
      const friendId = interaction.fields.getTextInputValue("friend_id");

      if (!vipData.customRoleId)
        return replyEmbed(
          interaction,
          "Atenção",
          "<:Nao:1443642030637977743> Crie sua tag primeiro."
        );

      // Busca a role para garantir que existe
      const role = await interaction.guild.roles
        .fetch(vipData.customRoleId)
        .catch(() => null);
      if (!role)
        return replyEmbed(
          interaction,
          "Erro Crítico",
          "<:Nao:1443642030637977743> Sua Tag foi deletada do servidor. Crie-a novamente."
        );

      const friend = await interaction.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (!friend)
        return replyEmbed(
          interaction,
          "Erro",
          "<:Nao:1443642030637977743> Usuário não encontrado no servidor."
        );

      // AWAIT (Banco de Dados)
      const res = await addFriend(interaction.user.id, friendId);
      if (!res.success)
        return replyEmbed(
          interaction,
          "Erro",
          `<:Nao:1443642030637977743> ${res.msg}`
        );

      try {
        await friend.roles.add(role);
        replyEmbed(
          interaction,
          "Sucesso",
          `<:certo_froid:1443643346722754692> **${friend.user.tag}** recebeu sua tag VIP!`
        );
      } catch (e) {
        console.error(e);
        replyEmbed(
          interaction,
          "Erro",
          "<:Nao:1443642030637977743> Erro ao dar o cargo. Verifique hierarquia."
        );
      }
    }
    return true;
  }
  return false;
};
