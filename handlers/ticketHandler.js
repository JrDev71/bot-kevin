// handlers/ticketHandler.js
const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
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

  // --- 1. ABRIR TICKET (THREAD) ---
  if (customId === BTN_OPEN) {
    await interaction.deferReply({ ephemeral: true });

    // Verifica se o canal pai é válido para criar threads
    const parentChannelId = config.TICKET_PARENT_CHANNEL_ID;
    const parentChannel = guild.channels.cache.get(parentChannelId);

    if (!parentChannel)
      return interaction.editReply("⚠️ Canal de Suporte não configurado.");

    // Verifica se o usuário já tem um ticket (Thread) ativo neste canal
    // (O Discord não tem um jeito fácil de buscar threads por dono, então buscamos pelo nome)
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
      // Cria a Thread Privada
      const thread = await parentChannel.threads.create({
        name: threadName,
        autoArchiveDuration: 60, // Arquiva após 1h de inatividade (padrão)
        type: ChannelType.PrivateThread, // Só staff e convidado veem
        reason: `Ticket aberto por ${user.tag}`,
      });

      // Adiciona o usuário à thread
      await thread.members.add(user.id);

      // Adiciona a Staff (se o cargo estiver configurado)
      // Nota: Quem tem permissão "Gerenciar Tópicos" já vê threads privadas.
      // Mas podemos mencionar o cargo para notificar.

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

      // Menciona a Staff e o Usuário
      const mentionStaff = config.APPROVER_ROLE_ID
        ? `<@&${config.APPROVER_ROLE_ID}>`
        : "";
      await thread.send({
        content: `${user} ${mentionStaff}`,
        embeds: [embed],
        components: [row],
      });

      return interaction.editReply({
        content: `<:certo_froid:1443643346722754692> Ticket criado: <#${thread.id}>`,
      });
    } catch (e) {
      console.error(e);
      return interaction.editReply(
        "<:Nao:1443642030637977743> Erro ao criar Tópico. Verifique se o bot tem permissão de 'Criar Tópicos Privados'."
      );
    }
  }

  // --- 2. FECHAR TICKET (Trancar Thread) ---
  if (customId === BTN_CLOSE) {
    // Confirmação
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN_DELETE)
        .setLabel("Encerrar Atendimento")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("<:vmc_lixeiraK:1443653159779041362>")
    );
    return interaction.reply({
      content: "Deseja encerrar este atendimento?",
      components: [row],
    });
  }

  // --- 3. TRANSCRIPT ---
  if (customId === BTN_TRANSCRIPT) {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel; // A thread atual

    const messages = await channel.messages.fetch({ limit: 100 });
    const logContent = messages
      .reverse()
      .map(
        (m) =>
          `[${new Date(m.createdTimestamp).toLocaleString()}] ${
            m.author.tag
          }: ${m.content} ${m.attachments.size > 0 ? "[Arquivo]" : ""}`
      )
      .join("\n");

    const attachment = new AttachmentBuilder(Buffer.from(logContent, "utf-8"), {
      name: `log-${channel.name}.txt`,
    });
    const logChannel = guild.channels.cache.get(config.TICKET_LOG_ID);

    if (logChannel) {
      await logChannel.send({
        content: `<:b_anotacTKF:1446495699985240215> Log de Ticket: \`${channel.name}\``,
        files: [attachment],
      });
      return interaction.editReply(
        "<:certo_froid:1443643346722754692> Log salvo no canal de registros."
      );
    }
    await interaction.user
      .send({ content: "Log do ticket:", files: [attachment] })
      .catch(() => {});
    return interaction.editReply(
      "<:certo_froid:1443643346722754692> Log enviado na sua DM (Canal de logs não configurado)."
    );
  }

  // --- 4. DELETAR (Apagar Thread) ---
  if (customId === BTN_DELETE) {
    const thread = interaction.channel;
    if (!thread.isThread())
      return interaction.reply({
        content: "Isso não é um ticket/tópico.",
        ephemeral: true,
      });

    await interaction.reply(
      "<:vmc_lixeiraK:1443653159779041362> Encerrando ticket..."
    );

    // Gera log final automático antes de deletar
    // (Opcional, copie a lógica do Transcript se quiser salvar sempre)

    setTimeout(() => {
      thread.delete().catch(() => {});
    }, 3000);
    return true;
  }

  return true;
};
