// commands/roles.js
const { EmbedBuilder } = require("discord.js");

// Emojis Customizados do Usuário (IDs) - Hardcoded aqui para o módulo ser auto-suficiente
const EMOJIS = {
  FREEFIRE_ID: "1437889904406433974",
  VALORANT_ID: "1437889927613517975",
};

/**
 * Função auxiliar para criar embeds de feedback (erros/uso).
 */
const createFeedbackEmbed = (title, description, color = 0xff0000) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
};

module.exports = {
  /**
   * Posta o painel de reação por cargo e notifica o usuário sobre o ID.
   */
  handleRoles: async (message) => {
    if (!message.member.permissions.has("MANAGE_GUILD")) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "🔒 Sem Permissão",
            `Você não tem permissão para postar o painel de cargos. Requer **Gerenciar Servidor**.`
          ),
        ],
      });
    }

    // Obtém objetos Emoji do cache para exibição
    const freefireEmoji = message.guild.emojis.cache.get(EMOJIS.FREEFIRE_ID);
    const valorantEmoji = message.guild.emojis.cache.get(EMOJIS.VALORANT_ID);

    const rolePanelEmbed = new EmbedBuilder()
      .setTitle("🎮 Escolha seu Jogo")
      .setDescription(
        "Reaja de acordo com seu jogo para que assim, quando estiverem jogando você fique sabendo. \n\n" +
          `${freefireEmoji || "FREEFIRE"} — Cargo de Free Fire\n` +
          `${valorantEmoji || "VALORANT"} — Cargo de Valorant\n\n` +
          "*Você pode remover o cargo tirando a reação.*"
      )
      .setColor(0x9b59b6)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setTimestamp();

    try {
      const sentMessage = await message.channel.send({
        embeds: [rolePanelEmbed],
      });

      // Adiciona as reações (usa os IDs)
      await sentMessage.react(EMOJIS.FREEFIRE_ID);
      await sentMessage.react(EMOJIS.VALORANT_ID);

      // Notificação de sucesso para o usuário (FLUXO CRÍTICO DE SINCRONIZAÇÃO)
      return message.author
        .send({
          embeds: [
            createFeedbackEmbed(
              "✅ Painel Postado com Sucesso!",
              `O painel foi postado! Por favor, **COPIE O ID DA MENSAGEM ABAIXO** e use-o para atualizar a variável \`ROLE_REACTION_MESSAGE_ID\` no seu arquivo \`.env\`.\n\n` +
                `**ID da Mensagem Recém-Criada:** \`${sentMessage.id}\`\n\n` +
                "Depois de atualizar o `.env`, **REINICIE O BOT**!",
              0x00ff00
            ),
          ],
        })
        .catch(() => {
          // Fallback para o canal, caso o DM esteja bloqueado
          message.channel.send({
            embeds: [
              createFeedbackEmbed(
                "✅ Painel Postado",
                `Painel postado. ID: \`${sentMessage.id}\`. Atualize seu \`.env\`!`,
                0x00ff00
              ),
            ],
          });
        });
    } catch (error) {
      console.error(
        "Erro ao postar ou reagir na mensagem do painel de cargos:",
        error
      );
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❌ Erro Crítico",
            "Falha ao postar o painel. Verifique se o bot tem permissão para enviar embeds e gerenciar reações."
          ),
        ],
      });
    }
  },
};
