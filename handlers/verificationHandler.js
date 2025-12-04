// handlers/verificationHandler.js
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

const VERIFY_BUTTON_ID = "start_verification";
const APPROVE_BUTTON_ID = "approve_user";
const REJECT_BUTTON_ID = "reject_user";

// CONFIG VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

module.exports = async (interaction) => {
  const config = interaction.client.config;
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();

  // 1. BOTÃO "VERIFICAR" -> MODAL
  if (isButton && interaction.customId === VERIFY_BUTTON_ID) {
    const modal = new ModalBuilder()
      .setCustomId("referral_modal")
      .setTitle("Verificação de Acesso");

    const referredUser = new TextInputBuilder()
      .setCustomId("referred_user_input")
      .setLabel("Quem convidou você?")
      .setPlaceholder("Digite o nome ou ID")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(referredUser));
    await interaction.showModal(modal);
    return true;
  }

  // 2. ENVIO DO MODAL -> FICHA PARA STAFF
  if (isModal && interaction.customId === "referral_modal") {
    await interaction.deferReply({ ephemeral: true });
    const referredUsername = interaction.fields.getTextInputValue(
      "referred_user_input"
    );
    const approvalChannel = interaction.guild.channels.cache.get(
      config.APPROVAL_CHANNEL_ID
    );

    if (!approvalChannel) {
      return interaction.followUp({
        content:
          "<:Nao:1443642030637977743> Erro interno: Canal de aprovação não configurado.",
        ephemeral: true,
      });
    }

    const approvalEmbed = new EmbedBuilder()
      .setTitle(`Solicitação de Acesso`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setImage(HEADER_IMAGE)
      .addFields(
        {
          name: "Usuário",
          value: `${interaction.user} (\`${interaction.user.id}\`)`,
          inline: true,
        },
        { name: "Referência", value: `\`${referredUsername}\``, inline: true },
        { name: "Status", value: "🟡 Aguardando Análise" }
      )
      .setColor(COLOR_NEUTRAL)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(APPROVE_BUTTON_ID)
        .setLabel("Aprovar Acesso")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:certo_froid:1443643346722754692>"),
      new ButtonBuilder()
        .setCustomId(REJECT_BUTTON_ID)
        .setLabel("Recusar Acesso")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⛔")
    );

    // Monta menção para ambos os cargos
    let mentionText = "";
    if (config.APPROVER_ROLE_ID)
      mentionText += `<@&${config.APPROVER_ROLE_ID}> `;
    if (config.SECONDARY_APPROVER_ROLE_ID)
      mentionText += `<@&${config.SECONDARY_APPROVER_ROLE_ID}>`;
    if (!mentionText) mentionText = "@Donos";

    await approvalChannel.send({
      content: mentionText,
      embeds: [approvalEmbed],
      components: [row],
    });
    await interaction.followUp({
      content: `<:certo_froid:1443643346722754692> Sua solicitação foi enviada para a equipe. Aguarde.`,
      ephemeral: true,
    });
    return true;
  }

  // 3. BOTÕES APROVAR/REJEITAR
  if (
    isButton &&
    [APPROVE_BUTTON_ID, REJECT_BUTTON_ID].includes(interaction.customId)
  ) {
    // --- CORREÇÃO AQUI: Verifica Primário OU Secundário OU Admin ---
    const hasPerm =
      (config.APPROVER_ROLE_ID &&
        interaction.member.roles.cache.has(config.APPROVER_ROLE_ID)) ||
      (config.SECONDARY_APPROVER_ROLE_ID &&
        interaction.member.roles.cache.has(config.SECONDARY_APPROVER_ROLE_ID));
    if (!hasPerm) {
      return interaction.reply({
        content: "🔒 Sem permissão.",
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.setImage(HEADER_IMAGE).setColor(COLOR_NEUTRAL);

    // Regex ajustada para pegar ID
    const targetId = embed.data.fields
      .find((f) => f.name === "Usuário" || f.name === "Membro")
      ?.value.match(/\d{17,20}/)?.[0];

    if (!targetId) {
      return interaction.followUp({
        content: "<:Nao:1443642030637977743> Erro: ID não encontrado na ficha.",
        ephemeral: true,
      });
    }

    const member = await interaction.guild.members
      .fetch(targetId)
      .catch(() => null);

    if (!member) {
      embed.data.fields.find((f) => f.name === "Status").value =
        "<:Nao:1443642030637977743> Usuário saiu do servidor";
      return interaction.editReply({ embeds: [embed], components: [] });
    }

    if (interaction.customId === APPROVE_BUTTON_ID) {
      try {
        if (member.roles) {
          await member.roles.add(config.VERIFIED_ROLE_ID);
          embed.data.fields.find(
            (f) => f.name === "Status"
          ).value = `<:certo_froid:1443643346722754692> Aprovado por ${interaction.user.username}`;

          const logChannel = interaction.guild.channels.cache.get(
            config.APPROVED_LOG_CHANNEL_ID
          );
          if (logChannel)
            logChannel.send({
              content: `<:certo_froid:1443643346722754692> Acesso liberado: ${member}`,
              embeds: [embed],
            });
        }
      } catch (error) {
        console.error("Erro ao dar cargo:", error);
        await interaction.followUp({
          content: `<:Nao:1443642030637977743> Erro ao dar cargo: Verifique a hierarquia.`,
          ephemeral: true,
        });
        return;
      }
    } else {
      embed.data.fields.find(
        (f) => f.name === "Status"
      ).value = `⛔ Recusado por ${interaction.user.username}`;
      member
        .send(
          `Sua solicitação de acesso em **${interaction.guild.name}** foi recusada pela liderança. Fora paneleiro`
        )
        .catch(() => {});
    }

    await interaction.editReply({ embeds: [embed], components: [] });
    return true;
  }

  return false;
};
