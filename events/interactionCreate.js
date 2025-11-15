// events/interactionCreate.js
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

// Importações dos módulos de jogo e estado
const { getGameState } = require("../game/gameState");
const {
  calculateScores,
  FINALIZE_BUTTON_ID,
  EDIT_BUTTON_ID,
  INVALIDATE_MODAL_ID,
  PLAYER_INPUT_ID,
  CATEGORY_INPUT_ID,
  postReviewEmbed,
} = require("../game/scoreSystem");

// Importa o gerenciador de rodadas
const { startRound } = require("../game/gameManager");

// IDs para a Lógica de Verificação
const VERIFY_BUTTON_ID = "start_verification";
const APPROVE_BUTTON_ID = "approve_user";
const REJECT_BUTTON_ID = "reject_user";

module.exports = async (interaction) => {
  const config = interaction.client.config;
  const isButton = interaction.isButton();

  // --- PARTE 1: VERIFICAÇÃO (BOTÕES E MODAL) ---

  // 1. CLIQUE NO BOTÃO PRINCIPAL (APLICAÇÃO)
  if (isButton && interaction.customId === VERIFY_BUTTON_ID) {
    const modal = new ModalBuilder()
      .setCustomId("referral_modal")
      .setTitle("Formulário de referência");

    const referredUser = new TextInputBuilder()
      .setCustomId("referred_user_input")
      .setLabel("Quem você conhece? (Nome ou ID)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(referredUser);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  } // 2. ENVIO DO MODAL (FICHA)
  else if (
    interaction.isModalSubmit() &&
    interaction.customId === "referral_modal"
  ) {
    await interaction.deferReply({ ephemeral: true });

    const referredUsername = interaction.fields.getTextInputValue(
      "referred_user_input"
    );
    const guild = interaction.guild;
    const member = interaction.member;

    const approvalChannel = guild.channels.cache.get(
      config.APPROVAL_CHANNEL_ID
    );
    if (!approvalChannel) {
      return interaction.followUp({
        content: "Erro interno: Canal de aprovação não configurado.",
        ephemeral: true,
      });
    }

    const approverRole = guild.roles.cache.get(config.APPROVER_ROLE_ID);

    const approvalEmbed = new EmbedBuilder()
      .setTitle(`👤 Nova Ficha de Verificação: ${member.user.tag}`)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        {
          name: "Membro",
          value: `${member.toString()} (${member.user.id})`,
        },
        {
          name: "Referência Informada",
          value: referredUsername,
        },
        { name: "Status", value: "PENDENTE DE APROVAÇÃO", inline: false }
      )
      .setColor(0xffa500);

    const approvalRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(APPROVE_BUTTON_ID)
        .setLabel("✅ Aprovar e Dar Cargo")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(REJECT_BUTTON_ID)
        .setLabel("❌ Rejeitar e Deletar")
        .setStyle(ButtonStyle.Danger)
    );

    await approvalChannel.send({
      content: `${approverRole.toString()}, uma nova ficha requer sua atenção.`,
      embeds: [approvalEmbed],
      components: [approvalRow],
    });

    await interaction.followUp({
      content: `✅ Sua ficha foi enviada para o canal de análise. Por favor, aguarde a aprovação dos bigode!`,
      ephemeral: true,
    });
  } // 3. CLIQUE NOS BOTÕES DE APROVAÇÃO/REJEIÇÃO
  else if (
    isButton &&
    [APPROVE_BUTTON_ID, REJECT_BUTTON_ID].includes(interaction.customId)
  ) {
    await interaction.deferUpdate();

    const hasPrimaryRole = interaction.member.roles.cache.has(
      config.APPROVER_ROLE_ID
    );
    const hasSecondaryRole = interaction.member.roles.cache.has(
      config.SECONDARY_APPROVER_ROLE_ID
    );

    const isStaffApprover =
      hasPrimaryRole ||
      hasSecondaryRole ||
      interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      );

    if (!isStaffApprover) {
      return interaction.followUp({
        content: "Você não tem permissão para usar este botão.",
        ephemeral: true,
      });
    }

    const oldEmbed = interaction.message.embeds[0].toJSON();
    const newEmbed = new EmbedBuilder(oldEmbed);

    const memberIdMatch = newEmbed.data.fields
      .find((f) => f.name === "Membro")
      .value.match(/\((\d+)\)/);
    const targetMemberId = memberIdMatch ? memberIdMatch[1] : null;

    if (!targetMemberId)
      return interaction.channel.send(
        "Erro: Não foi possível encontrar o ID do membro alvo."
      );

    const targetMember = await interaction.guild.members
      .fetch(targetMemberId)
      .catch((e) => {
        console.error(
          `[VERIFICAÇÃO] Erro ao buscar membro ${targetMemberId}:`,
          e
        );
        return null;
      });

    // Se o membro saiu do servidor antes da aprovação/rejeição
    if (!targetMember) {
      newEmbed.setColor(0xaaaaaa).setFooter({
        text: `Ação tomada por ${interaction.user.tag}. Membro não encontrado no servidor.`,
      });
      newEmbed.data.fields.find((f) => f.name === "Status").value =
        "ERRO: MEMBRO NÃO ENCONTRADO";

      await interaction.editReply({ embeds: [newEmbed], components: [] });
      return interaction.followUp({
        content: `❌ Erro: O membro <@${targetMemberId}> não está mais no servidor.`,
        ephemeral: true,
      });
    }

    // --- LÓGICA DE APROVAÇÃO ---
    if (interaction.customId === APPROVE_BUTTON_ID) {
      const memberRole = interaction.guild.roles.cache.get(
        config.VERIFIED_ROLE_ID
      );

      if (!memberRole) {
        console.error(
          "[VERIFICAÇÃO] ID do cargo de membro não configurado (config.VERIFIED_ROLE_ID)."
        );
        return interaction.followUp({
          content:
            "Erro: ID do cargo de membro (config.VERIFIED_ROLE_ID) não configurado.",
          ephemeral: true,
        });
      }

      try {
        await targetMember.roles.add(memberRole);

        newEmbed
          .setColor(0x00ff00) // Verde
          .setFooter({ text: `Aprovado por ${interaction.user.tag}` });
        newEmbed.data.fields.find((f) => f.name === "Status").value =
          "✅ APROVADO";

        await interaction.editReply({ embeds: [newEmbed], components: [] });

        // LOG DE APROVAÇÃO ENVIADO AO CANAL #aprovados ===
        const logChannel = interaction.guild.channels.cache.get(
          config.APPROVED_LOG_CHANNEL_ID
        );
        if (logChannel) {
          await logChannel.send({
            content: `✅ Nova aprovação! Ficha finalizada por ${interaction.user.tag}.`,
            embeds: [newEmbed],
          });
        }
        // ========================================================

        // Envia feedback privado ao moderador
        return interaction.followUp({
          content: `✅ Você aprovou **${targetMember.user.tag}** e concedeu o cargo **${memberRole.name}**.`,
          ephemeral: true,
        });
      } catch (e) {
        console.error(
          `[VERIFICAÇÃO] Erro ao adicionar cargo a ${targetMember.user.tag}:`,
          e
        );
        newEmbed.data.fields.find((f) => f.name === "Status").value =
          "❌ ERRO AO DAR CARGO";
        await interaction.editReply({ embeds: [newEmbed], components: [] });
        return interaction.followUp({
          content: `❌ Erro: Não foi possível adicionar o cargo a ${targetMember.user.tag}. Verifique as permissões do bot.`,
          ephemeral: true,
        });
      }
    }

    // --- LÓGICA DE REJEIÇÃO ---
    else if (interaction.customId === REJECT_BUTTON_ID) {
      newEmbed
        .setColor(0xff0000) // Vermelho
        .setFooter({ text: `Rejeitado por ${interaction.user.tag}` });
      newEmbed.data.fields.find((f) => f.name === "Status").value =
        "❌ REJEITADO";

      await interaction.editReply({ embeds: [newEmbed], components: [] });

      await targetMember
        .send(
          `Sua ficha de verificação no servidor ${interaction.guild.name} foi rejeitada. Sai fora paneleiro safado`
        )
        .catch(() =>
          console.log(
            `Não foi possível enviar DM para ${targetMember.user.tag}`
          )
        );

      // Envia feedback privado ao moderador
      return interaction.followUp({
        content: `❌ Você rejeitou a ficha de **${targetMember.user.tag}**.`,
        ephemeral: true,
      });
    }
  }

  // --- PARTE 2: STOP GAME (FLUXO DE REVISÃO) ---

  // 4. CLIQUE NO BOTÃO DE CORREÇÃO (ABRIR MODAL)
  else if (isButton && interaction.customId === EDIT_BUTTON_ID) {
    const isStaff = interaction.member.permissions.has(
      PermissionsBitField.Flags.ManageGuild
    );

    if (!isStaff) {
      return interaction.reply({
        content: "Apenas a Staff pode usar a ferramenta de correção.",
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(INVALIDATE_MODAL_ID)
      .setTitle("Corrigir Resposta");

    const playerInput = new TextInputBuilder()
      .setCustomId(PLAYER_INPUT_ID)
      .setLabel("ID do Jogador (ou @Menção)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: 123456789 ou @Thulio")
      .setRequired(true);

    const categoryInput = new TextInputBuilder()
      .setCustomId(CATEGORY_INPUT_ID)
      .setLabel("Categoria a invalidar (Exato, ou 'TODOS')")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: Nome de Pessoa")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(playerInput),
      new ActionRowBuilder().addComponents(categoryInput)
    );

    await interaction.showModal(modal);
  }

  // 5. SUBMISSÃO DO MODAL DE CORREÇÃO
  else if (
    interaction.isModalSubmit() &&
    interaction.customId === INVALIDATE_MODAL_ID
  ) {
    await interaction.deferReply({ ephemeral: true });

    const state = getGameState(interaction.guild.id);
    const playerIdentifier = interaction.fields
      .getTextInputValue(PLAYER_INPUT_ID)
      .trim();
    const categoryName = interaction.fields
      .getTextInputValue(CATEGORY_INPUT_ID)
      .trim()
      .toUpperCase();

    // Lógica para encontrar o PlayerID (suporta menção e ID)
    let playerID;
    const mentionMatch = playerIdentifier.match(/^<@!?(\d+)>$/);

    if (mentionMatch) {
      playerID = mentionMatch[1];
    } else if (!isNaN(playerIdentifier) && playerIdentifier.length > 15) {
      playerID = playerIdentifier;
    } else {
      const member = interaction.guild.members.cache.find(
        (m) =>
          m.user.tag.toUpperCase() === playerIdentifier.toUpperCase() ||
          m.nickname?.toUpperCase() === playerIdentifier.toUpperCase()
      );
      playerID = member ? member.id : null;
    }

    if (!playerID || !state.players[playerID]) {
      return interaction.followUp({
        content: "❌ Jogador não encontrado ou não participou desta rodada.",
        ephemeral: true,
      });
    }

    const playerState = state.players[playerID];
    const categoryIndex = state.categories
      .map((c) => c.toUpperCase())
      .indexOf(categoryName);

    const isCategoryValid = categoryIndex !== -1;
    const isInvalidateAll = categoryName === "TODOS";

    let successCount = 0;

    if (isInvalidateAll) {
      playerState.answers = playerState.answers.map((a) => "");
      successCount = state.categories.length;
    } else if (isCategoryValid) {
      playerState.answers[categoryIndex] = "";
      successCount = 1;
    } else {
      return interaction.followUp({
        content: `❌ Categoria "${categoryName}" não encontrada. Use o nome exato da categoria ou "TODOS".`,
        ephemeral: true,
      });
    }

    await postReviewEmbed(state, interaction.channel);

    await interaction.followUp({
      content: `✅ ${successCount} resposta(s) de <@${playerID}> invalidada(s) para a(s) categoria(s) em questão. A tabela de revisão foi atualizada.`,
      ephemeral: true,
    });
  }

  // 6. CLIQUE NO BOTão DE FINALIZAR PONTUAÇÃO
  else if (isButton && interaction.customId === FINALIZE_BUTTON_ID) {
    await interaction.deferUpdate();

    const isStaff = interaction.member.permissions.has(
      PermissionsBitField.Flags.ManageGuild
    );

    if (!isStaff) {
      return interaction.followUp({
        content: "Apenas a Staff pode finalizar a pontuação.",
        ephemeral: true,
      });
    }

    const state = getGameState(interaction.guild.id);

    await interaction.editReply({
      content: `Pontuação finalizada por ${interaction.user.tag}. Calculando placar...`,
      embeds: interaction.message.embeds,
      components: [],
    });

    await calculateScores(state, interaction.channel);

    const { startRound } = require("../game/gameManager");
    await startRound(interaction.message, state);
  }
};
