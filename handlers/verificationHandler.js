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

// --- CONFIGURAÇÃO VISUAL ---
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/1323511636518371360/1323511704248258560/S2_banner_1.png?ex=6775761a&is=6774249a&hm=52d8e058752746d0f07363140799265a78070602456c93537c7d1135c7203d1a&";
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
        content: "❌ Erro interno: Canal de aprovação não configurado.",
        ephemeral: true,
      });
    }

    const approvalEmbed = new EmbedBuilder()
      .setTitle(`Solicitação de Acesso`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setImage(HEADER_IMAGE) // IMAGEM PADRÃO
      .addFields(
        {
          name: "Usuário",
          value: `${interaction.user} (\`${interaction.user.id}\`)`,
          inline: true,
        },
        { name: "Referência", value: `\`${referredUsername}\``, inline: true },
        { name: "Status", value: "🟡 Aguardando Análise" }
      )
      .setColor(COLOR_NEUTRAL) // COR NEUTRA
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      // BOTÕES CINZA (SECONDARY) - Mais limpo e profissional
      new ButtonBuilder()
        .setCustomId(APPROVE_BUTTON_ID)
        .setLabel("Aprovar Acesso")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId(REJECT_BUTTON_ID)
        .setLabel("Recusar Acesso")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⛔")
    );

    // Menciona a Staff de forma discreta
    const mention = config.APPROVER_ROLE_ID
      ? `<@&${config.APPROVER_ROLE_ID}>`
      : "";

    await approvalChannel.send({
      content: mention,
      embeds: [approvalEmbed],
      components: [row],
    });
    await interaction.followUp({
      content: `✅ Sua solicitação foi enviada para a equipe. Aguarde.`,
      ephemeral: true,
    });
    return true;
  }

  // 3. BOTÕES APROVAR/REJEITAR
  if (
    isButton &&
    [APPROVE_BUTTON_ID, REJECT_BUTTON_ID].includes(interaction.customId)
  ) {
    // Checagem de Permissão (Mantida)
    const hasPrimary =
      config.APPROVER_ROLE_ID &&
      interaction.member.roles.cache.has(config.APPROVER_ROLE_ID);
    const hasSecondary =
      config.SECONDARY_APPROVER_ROLE_ID &&
      interaction.member.roles.cache.has(config.SECONDARY_APPROVER_ROLE_ID);
    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    if (!hasPrimary && !hasSecondary && !isAdmin) {
      return interaction.reply({
        content: "🔒 Apenas a equipe de verificação pode interagir.",
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    // Garante visual padrão na edição
    embed.setImage(HEADER_IMAGE).setColor(COLOR_NEUTRAL);

    // Regex para pegar ID do campo "Usuário" ou "Membro"
    const targetId = embed.data.fields
      .find((f) => f.name === "Usuário" || f.name === "Membro")
      .value.match(/\((\d+)\)/)?.[1];
    const member = await interaction.guild.members
      .fetch(targetId)
      .catch(() => null);

    if (!member) {
      embed.data.fields.find((f) => f.name === "Status").value =
        "❌ Usuário saiu do servidor";
      return interaction.editReply({ embeds: [embed], components: [] });
    }

    if (interaction.customId === APPROVE_BUTTON_ID) {
      try {
        await member.roles.add(config.VERIFIED_ROLE_ID);
        embed.data.fields.find(
          (f) => f.name === "Status"
        ).value = `✅ Aprovado por ${interaction.user.username}`;

        // Log de Aprovação
        const logChannel = interaction.guild.channels.cache.get(
          config.APPROVED_LOG_CHANNEL_ID
        );
        if (logChannel)
          logChannel.send({
            content: `✅ Acesso liberado: ${member}`,
            embeds: [embed],
          });
      } catch (error) {
        console.error("Erro ao dar cargo:", error);
        await interaction.followUp({
          content: "❌ Erro de permissão ao dar o cargo.",
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
          `Sua solicitação de acesso em **${interaction.guild.name}** foi recusada pela moderação.`
        )
        .catch(() => {});
    }

    await interaction.editReply({ embeds: [embed], components: [] });
    return true;
  }

  return false;
};
