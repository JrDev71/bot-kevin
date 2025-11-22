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

module.exports = async (interaction) => {
  const config = interaction.client.config;
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();

  // 1. Botão "Verificar" -> Modal
  if (isButton && interaction.customId === VERIFY_BUTTON_ID) {
    const modal = new ModalBuilder()
      .setCustomId("referral_modal")
      .setTitle("Formulário de referência");
    const referredUser = new TextInputBuilder()
      .setCustomId("referred_user_input")
      .setLabel("Quem você conhece? (Nome ou ID)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(referredUser));
    await interaction.showModal(modal);
    return true; // Retorna true para parar o processamento no index
  }

  // 2. Envio do Modal
  if (isModal && interaction.customId === "referral_modal") {
    await interaction.deferReply({ ephemeral: true });
    const referredUsername = interaction.fields.getTextInputValue(
      "referred_user_input"
    );
    const approvalChannel = interaction.guild.channels.cache.get(
      config.APPROVAL_CHANNEL_ID
    );

    if (!approvalChannel)
      return interaction.followUp({
        content: "Erro interno: Canal de aprovação não configurado.",
        ephemeral: true,
      });

    const approvalEmbed = new EmbedBuilder()
      .setTitle(`👤 Nova Ficha: ${interaction.user.tag}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        {
          name: "Membro",
          value: `${interaction.user} (${interaction.user.id})`,
        },
        { name: "Referência", value: referredUsername },
        { name: "Status", value: "PENDENTE" }
      )
      .setColor(0xffa500);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(APPROVE_BUTTON_ID)
        .setLabel("Aprovar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(REJECT_BUTTON_ID)
        .setLabel("Rejeitar")
        .setStyle(ButtonStyle.Danger)
    );

    await approvalChannel.send({
      content: `<@&${config.APPROVER_ROLE_ID}>`,
      embeds: [approvalEmbed],
      components: [row],
    });
    await interaction.followUp({
      content: `✅ Ficha enviada!`,
      ephemeral: true,
    });
    return true;
  }

  // 3. Aprovar/Rejeitar
  if (
    isButton &&
    [APPROVE_BUTTON_ID, REJECT_BUTTON_ID].includes(interaction.customId)
  ) {
    await interaction.deferUpdate();
    const hasPerm =
      interaction.member.roles.cache.has(config.APPROVER_ROLE_ID) ||
      interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      );
    if (!hasPerm)
      return interaction.followUp({
        content: "Sem permissão.",
        ephemeral: true,
      });

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const targetId = embed.data.fields
      .find((f) => f.name === "Membro")
      .value.match(/\((\d+)\)/)?.[1];
    const member = await interaction.guild.members
      .fetch(targetId)
      .catch(() => null);

    if (!member) {
      embed
        .setColor(0xaaaaaa)
        .data.fields.find((f) => f.name === "Status").value =
        "SAIU DO SERVIDOR";
      return interaction.editReply({ embeds: [embed], components: [] });
    }

    if (interaction.customId === APPROVE_BUTTON_ID) {
      await member.roles.add(config.VERIFIED_ROLE_ID).catch(console.error);
      embed
        .setColor(0x00ff00)
        .data.fields.find(
          (f) => f.name === "Status"
        ).value = `✅ APROVADO por ${interaction.user.tag}`;

      const logChannel = interaction.guild.channels.cache.get(
        config.APPROVED_LOG_CHANNEL_ID
      );
      if (logChannel)
        logChannel.send({ content: `✅ Aprovado: ${member}`, embeds: [embed] });
    } else {
      embed
        .setColor(0xff0000)
        .data.fields.find(
          (f) => f.name === "Status"
        ).value = `❌ REJEITADO por ${interaction.user.tag}`;
      member
        .send(
          `Sua verificação em **${interaction.guild.name}** foi rejeitada, sai fora paneleiro.`
        )
        .catch(() => {});
    }
    await interaction.editReply({ embeds: [embed], components: [] });
    return true;
  }

  return false; // Não processou nada
};
