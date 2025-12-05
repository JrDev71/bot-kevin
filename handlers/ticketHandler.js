// handlers/ticketHandler.js
const {
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  MessageFlags,
} = require("discord.js");

const { BTN_OPEN } = require("../commands/ticketPanel");
const BTN_CLOSE = "btn_ticket_close";
const BTN_TRANSCRIPT = "btn_ticket_transcript";
const BTN_DELETE = "btn_ticket_delete";

// VISUAL
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1446478914468974742/ticket-banner.png?ex=693421f7&is=6932d077&hm=cf586cf1ba2ae3770bcc3d436cbbf044df522986ead23ff6cbff17e876d07570&";
const COLOR_NEUTRAL = 0x2f3136;

module.exports = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (
    ![BTN_OPEN, BTN_CLOSE, BTN_TRANSCRIPT, BTN_DELETE].includes(
      interaction.customId
    )
  )
    return false;

  const { customId, guild, user } = interaction;
  const config = interaction.client.config;

  // --- 1. ABRIR TICKET ---
  if (customId === BTN_OPEN) {
    // Debug Log
    console.log(`[TICKET] Tentativa de abrir por ${user.tag}`);
    console.log(
      `[TICKET] ID Pai Configurado: ${config.TICKET_PARENT_CHANNEL_ID}`
    );

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const parentChannelId = config.TICKET_PARENT_CHANNEL_ID;
    const parentChannel = guild.channels.cache.get(parentChannelId);

    if (!parentChannel) {
      console.error("[TICKET ERROR] Canal pai não encontrado no cache.");
      return interaction.editReply(
        "⚠️ Erro de Configuração: Canal de Suporte não encontrado (ID inválido no .env?)."
      );
    }

    const threadName = `ticket-${user.username}`;
    const existingThread = parentChannel.threads.cache.find(
      (t) => t.name === threadName && !t.archived
    );

    if (existingThread) {
      return interaction.editReply(
        `<:Nao:1443642030637977743> Você já tem um ticket aberto: <#${existingThread.id}>`
      );
    }

    try {
      const thread = await parentChannel.threads.create({
        name: threadName,
        autoArchiveDuration: 60,
        type: ChannelType.PrivateThread,
        reason: `Ticket de ${user.tag}`,
      });

      await thread.members.add(user.id);

      const embed = new EmbedBuilder()
        .setTitle(`<:W_Ticket:1446489399897358336> Atendimento Iniciado`)
        .setDescription(
          `Olá ${user}! Descreva seu problema.\nA moderação foi notificada.`
        )
        .setColor(COLOR_NEUTRAL)
        .setImage(HEADER_IMAGE);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(BTN_CLOSE)
          .setLabel("Fechar")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:cadeado:1443642375833518194>"),
        new ButtonBuilder()
          .setCustomId(BTN_TRANSCRIPT)
          .setLabel("Log")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:b_anotacTKF:1446495699985240215>")
      );

      const mention = config.APPROVER_ROLE_ID
        ? `<@&${config.APPROVER_ROLE_ID}>`
        : "";
      await thread.send({
        content: `${user} ${mention}`,
        embeds: [embed],
        components: [row],
      });

      return interaction.editReply({
        content: `<:certo_froid:1443643346722754692> Ticket criado: <#${thread.id}>`,
      });
    } catch (e) {
      console.error("[TICKET ERROR]", e);
      return interaction.editReply(
        "<:Nao:1443642030637977743> Erro ao criar Tópico. Verifique permissões do bot."
      );
    }
  }

  // --- 2. FECHAR ---
  if (customId === BTN_CLOSE) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN_DELETE)
        .setLabel("Encerrar Atendimento")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:vmc_lixeiraK:1443653159779041362>")
    );
    return interaction.reply({
      content: "Deseja encerrar e salvar o log?",
      components: [row],
    });
  }

  // --- 3. LOG (Manual) ---
  if (customId === BTN_TRANSCRIPT) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const channel = interaction.channel;

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const logContent = messages
        .reverse()
        .map(
          (m) =>
            `[${new Date(m.createdTimestamp).toLocaleString()}] ${
              m.author.tag
            }: ${m.content}`
        )
        .join("\n");
      const attachment = new AttachmentBuilder(
        Buffer.from(logContent, "utf-8"),
        { name: `log-${channel.name}.txt` }
      );

      const logChannel = guild.channels.cache.get(config.TICKET_LOG_ID);
      if (logChannel) {
        await logChannel.send({
          content: `<:b_anotacTKF:1446495699985240215> Log de Ticket (Manual): \`${channel.name}\``,
          files: [attachment],
        });
        return interaction.editReply(
          "<:certo_froid:1443643346722754692> Log salvo."
        );
      }

      await interaction.user.send({
        content: "Log do ticket:",
        files: [attachment],
      });
      return interaction.editReply(
        "<:certo_froid:1443643346722754692> Log enviado na DM."
      );
    } catch (e) {
      return interaction.editReply("Erro ao gerar log.");
    }
  }

  // --- 4. DELETAR (Automático com Log) ---
  if (customId === BTN_DELETE) {
    const thread = interaction.channel;
    if (!thread.isThread())
      return interaction.reply({
        content: "Erro: Canal inválido.",
        flags: MessageFlags.Ephemeral,
      });

    await interaction.reply(
      "<:vmc_lixeiraK:1443653159779041362> Gerando log e encerrando..."
    );

    // Tenta gerar e enviar o log antes de deletar
    try {
      const messages = await thread.messages.fetch({ limit: 100 });
      const logContent = messages
        .reverse()
        .map(
          (m) =>
            `[${new Date(m.createdTimestamp).toLocaleString()}] ${
              m.author.tag
            }: ${m.content}`
        )
        .join("\n");

      const attachment = new AttachmentBuilder(
        Buffer.from(logContent, "utf-8"),
        { name: `log-${thread.name}.txt` }
      );

      const logChannel = guild.channels.cache.get(config.TICKET_LOG_ID);

      if (logChannel) {
        await logChannel.send({
          content: `<:b_anotacTKF:1446495699985240215> **Ticket Encerrado:** \`${thread.name}\`\n👤 Fechado por: ${user}`,
          files: [attachment],
        });
      } else {
        console.warn(
          "[TICKET] Canal de Log não encontrado para salvar o transcript."
        );
      }
    } catch (error) {
      console.error("[TICKET ERROR] Falha ao gerar log no delete:", error);
    }

    // Aguarda um pouco e deleta
    setTimeout(() => {
      thread.delete().catch(() => {});
    }, 3000);

    return true;
  }

  return true;
};
