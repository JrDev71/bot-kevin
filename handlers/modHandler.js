// handlers/modHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require("discord.js");
const { BTN } = require("../commands/modPanel");
const logEmbed = require("../utils/logEmbed");

// IDs Internos
const SEL_USER = "sel_mod_user"; // Selecionar Alvo
const SEL_ACTION = "sel_mod_action"; // Selecionar Tipo de Punição
const SEL_CHAT = "sel_mod_chat"; // Selecionar Ação de Chat
const MDL_REASON = "mdl_mod_reason"; // Modal de Motivo
const BTN_NUKE_CONFIRM = "btn_mod_nuke_confirm";

// Cache temporário para guardar o Alvo e a Ação enquanto o staff digita o motivo
const modCache = new Map();

module.exports = async (interaction) => {
  const isButton = interaction.isButton();
  const isSelect = interaction.isAnySelectMenu();
  const isModal = interaction.isModalSubmit();

  // Verificação de Segurança
  const trustedRoles = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  const isStaff =
    interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    ) ||
    interaction.member.roles.cache.some((r) => trustedRoles.includes(r.id));

  // Se não for staff, bloqueia interação com componentes de moderação
  if (!isStaff && (isButton || isSelect || isModal)) {
    const allIds = Object.values(BTN).concat([
      SEL_USER,
      SEL_ACTION,
      SEL_CHAT,
      MDL_REASON,
      BTN_NUKE_CONFIRM,
    ]);
    // Verificação simplificada: se o customId contém "mod", bloqueia
    if (interaction.customId.includes("_mod_")) {
      return interaction.reply({
        content: "🔒 Acesso negado.",
        ephemeral: true,
      });
    }
  }

  // --- BOTÕES INICIAIS ---
  if (isButton) {
    // 1. PUNIR (Abre seletor de usuário)
    if (interaction.customId === BTN.PUNISH) {
      const row = new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(SEL_USER)
          .setPlaceholder("Selecione o infrator")
      );
      return interaction.reply({
        content: "Quem você deseja punir?",
        components: [row],
        ephemeral: true,
      });
    }

    // 2. CHAT (Abre menu de ações)
    if (interaction.customId === BTN.CHAT) {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(SEL_CHAT)
          .setPlaceholder("Selecione a ação")
          .addOptions([
            { label: "Limpar 10 mensagens", value: "clear_10", emoji: "🧹" },
            { label: "Limpar 50 mensagens", value: "clear_50", emoji: "🧹" },
            { label: "Limpar 100 mensagens", value: "clear_100", emoji: "🧹" },
            { label: "Trancar Canal (Lock)", value: "lock", emoji: "🔒" },
            {
              label: "Destrancar Canal (Unlock)",
              value: "unlock",
              emoji: "🔓",
            },
          ])
      );
      return interaction.reply({
        content: "O que deseja fazer neste canal?",
        components: [row],
        ephemeral: true,
      });
    }

    // 3. NUKE (Confirmação)
    if (interaction.customId === BTN.NUKE) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(BTN_NUKE_CONFIRM)
          .setLabel("CONFIRMAR NUKE")
          .setStyle(ButtonStyle.Danger)
      );
      return interaction.reply({
        content:
          "⚠️ **PERIGO:** Isso apagará todo o histórico deste canal. Tem certeza?",
        components: [row],
        ephemeral: true,
      });
    }

    // 4. NUKE CONFIRMADO
    if (interaction.customId === BTN_NUKE_CONFIRM) {
      // Importa e usa a função do nuke.js que já criamos, ou replica lógica simples aqui
      const channel = interaction.channel;
      const pos = channel.position;
      await interaction.reply("💥 Nuking...");
      const newChannel = await channel.clone();
      await newChannel.setPosition(pos);
      await channel.delete();
      newChannel.send("💥 Canal resetado via Painel de Moderação.");
      return;
    }
  }

  // --- SELETORES ---
  if (isSelect) {
    // A. SELECIONOU O USUÁRIO -> MOSTRA OPÇÕES DE PUNIÇÃO
    if (interaction.customId === SEL_USER) {
      const targetId = interaction.values[0];
      // Salva o ID no cache (chave = ID do Staff)
      modCache.set(interaction.user.id, { targetId });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(SEL_ACTION)
          .setPlaceholder("Escolha a punição")
          .addOptions([
            {
              label: "Banir",
              value: "ban",
              description: "Banimento permanente",
              emoji: "🔨",
            },
            {
              label: "Expulsar (Kick)",
              value: "kick",
              description: "Remove do servidor",
              emoji: "🦶",
            },
            { label: "Castigo 10m", value: "timeout_10m", emoji: "🤐" },
            { label: "Castigo 1h", value: "timeout_1h", emoji: "🤐" },
            { label: "Castigo 24h", value: "timeout_24h", emoji: "🤐" },
            { label: "Remover Castigo", value: "unmute", emoji: "🔊" },
          ])
      );
      return interaction.update({
        content: `Alvo: <@${targetId}>. Selecione a pena:`,
        components: [row],
      });
    }

    // B. SELECIONOU A PUNIÇÃO -> ABRE MODAL DE MOTIVO
    if (interaction.customId === SEL_ACTION) {
      const action = interaction.values[0];
      const cache = modCache.get(interaction.user.id);
      if (!cache)
        return interaction.update({
          content: "Tempo esgotado.",
          components: [],
        });

      cache.action = action; // Salva a ação

      // Abre Modal para motivo
      const modal = new ModalBuilder()
        .setCustomId(MDL_REASON)
        .setTitle(`Motivo: ${action.toUpperCase()}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Motivo")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );
      return interaction.showModal(modal);
    }

    // C. AÇÕES DE CHAT
    if (interaction.customId === SEL_CHAT) {
      await interaction.deferReply({ ephemeral: true });
      const action = interaction.values[0];
      const channel = interaction.channel;

      try {
        if (action.startsWith("clear_")) {
          const amount = parseInt(action.split("_")[1]);
          await channel.bulkDelete(amount, true);
          interaction.editReply(`✅ Limpei ${amount} mensagens.`);
        }
        if (action === "lock") {
          await channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            { SendMessages: false }
          );
          interaction.editReply("🔒 Canal trancado.");
          channel.send({
            embeds: [
              new EmbedBuilder().setTitle("🔒 TRANCADO").setColor(0xff0000),
            ],
          });
        }
        if (action === "unlock") {
          await channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            { SendMessages: null }
          );
          interaction.editReply("🔓 Canal destrancado.");
          channel.send({
            embeds: [
              new EmbedBuilder().setTitle("🔓 DESTRANCADO").setColor(0x00ff00),
            ],
          });
        }
      } catch (e) {
        interaction.editReply(`Erro: ${e.message}`);
      }
      return true;
    }
  }

  // --- MODAL (EXECUÇÃO FINAL DA PUNIÇÃO) ---
  if (isModal && interaction.customId === MDL_REASON) {
    await interaction.deferReply({ ephemeral: true });
    const reason = interaction.fields.getTextInputValue("reason");
    const cache = modCache.get(interaction.user.id);

    if (!cache) return interaction.editReply("Erro de cache. Tente novamente.");

    const target = await interaction.guild.members
      .fetch(cache.targetId)
      .catch(() => null);
    if (!target) return interaction.editReply("Usuário saiu do servidor.");

    // Proteção de Hierarquia
    if (
      target.roles.highest.position >=
        interaction.member.roles.highest.position &&
      interaction.user.id !== interaction.guild.ownerId
    ) {
      return interaction.editReply(
        "❌ Você não pode punir alguém com cargo maior ou igual ao seu."
      );
    }

    const action = cache.action;
    const logId = interaction.client.config.MOD_BAN_LOG_ID; // Usa log de ban/mute

    try {
      if (action === "ban") {
        await target.ban({
          reason: `[Painel] ${interaction.user.tag}: ${reason}`,
        });
        interaction.editReply(`🔨 **${target.user.tag}** banido.`);
        await logEmbed(
          interaction.client,
          logId,
          "Membro Banido",
          `Alvo: ${target}\nMotivo: ${reason}\nPor: ${interaction.user}`,
          0xff0000
        );
      } else if (action === "kick") {
        await target.kick(`[Painel] ${interaction.user.tag}: ${reason}`);
        interaction.editReply(`🦶 **${target.user.tag}** expulso.`);
      } else if (action.startsWith("timeout")) {
        const duration =
          action === "timeout_10m"
            ? 10 * 60 * 1000
            : action === "timeout_1h"
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;
        await target.timeout(
          duration,
          `[Painel] ${interaction.user.tag}: ${reason}`
        );
        interaction.editReply(`🤐 **${target.user.tag}** silenciado.`);
        await logEmbed(
          interaction.client,
          interaction.client.config.MOD_MUTE_LOG_ID,
          "Membro Castigado",
          `Alvo: ${target}\nTempo: ${action}\nMotivo: ${reason}`,
          0xe67e22
        );
      } else if (action === "unmute") {
        await target.timeout(
          null,
          `[Painel] ${interaction.user.tag}: ${reason}`
        );
        interaction.editReply(`🔊 **${target.user.tag}** liberado.`);
      }
    } catch (e) {
      interaction.editReply(`❌ Erro ao aplicar punição: ${e.message}`);
    }

    modCache.delete(interaction.user.id);
    return true;
  }

  return false;
};
