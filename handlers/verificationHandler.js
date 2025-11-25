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
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId(REJECT_BUTTON_ID)
        .setLabel("Recusar Acesso")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⛔")
    );

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
    // Checagem de Permissão
    const hasPerm =
      (config.APPROVER_ROLE_ID &&
        interaction.member.roles.cache.has(config.APPROVER_ROLE_ID)) ||
      interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      );
    if (!hasPerm)
      return interaction.reply({
        content: "🔒 Sem permissão.",
        ephemeral: true,
      });

    await interaction.deferUpdate();

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.setImage(HEADER_IMAGE).setColor(COLOR_NEUTRAL);

    // --- CORREÇÃO DA REGEX AQUI ---
    // Procura por qualquer sequência de 17 a 20 números no campo 'Usuário' ou 'Membro'
    // Isso funciona com ou sem crases, com ou sem parenteses.
    const targetId = embed.data.fields
      .find((f) => f.name === "Usuário" || f.name === "Membro")
      ?.value.match(/\d{17,20}/)?.[0];

    if (!targetId) {
      return interaction.followUp({
        content:
          "❌ Erro: Não foi possível encontrar o ID do usuário na ficha.",
        ephemeral: true,
      });
    }

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
        // Verificação extra para garantir que 'member.roles' existe
        if (member.roles) {
          await member.roles.add(config.VERIFIED_ROLE_ID);
          embed.data.fields.find(
            (f) => f.name === "Status"
          ).value = `✅ Aprovado por ${interaction.user.username}`;

          const logChannel = interaction.guild.channels.cache.get(
            config.APPROVED_LOG_CHANNEL_ID
          );
          if (logChannel)
            logChannel.send({
              content: `✅ Acesso liberado: ${member}`,
              embeds: [embed],
            });
        } else {
          throw new Error("Objeto member.roles indefinido.");
        }
      } catch (error) {
        console.error("Erro ao dar cargo:", error);
        // Não retorna erro para não travar a edição da mensagem, apenas loga
        await interaction.followUp({
          content: `❌ Erro ao dar cargo: Verifique a hierarquia do bot.`,
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
