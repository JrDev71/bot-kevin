// commands/roncaputa.js
const { EmbedBuilder } = require("discord.js");

module.exports = {
  // Implementação como um objeto simples para comando de prefixo
  handleClear: async (message) => {
    const targetUser = message.author;
    const channel = message.channel;

    // O bot precisa da permissão MANAGE_MESSAGES para usar bulkDelete
    if (!channel.permissionsFor(message.client.user).has("ManageMessages")) {
      return channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🔒 Erro de Permissão")
              .setDescription(
                "Eu preciso da permissão **Gerenciar Mensagens** neste canal para executar a limpeza."
              )
              .setColor(0xff0000),
          ],
        })
        .then((m) => setTimeout(() => m.delete(), 5000));
    }

    // 1. Coletar as mensagens no canal (limitado a 100 mensagens por vez)
    const fetchedMessages = await channel.messages.fetch({ limit: 100 });

    // 2. Filtrar as mensagens para manter apenas as do usuário que deu o comando
    const userMessages = fetchedMessages.filter(
      (m) => m.author.id === targetUser.id
    );

    const count = userMessages.size;

    if (count === 0) {
      return channel
        .send({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `🧹 Não encontrei mensagens suas para apagar nas últimas 100 mensagens.`
              )
              .setColor(0x00bfff),
          ],
        })
        .then((m) => setTimeout(() => m.delete(), 5000));
    }

    // 3. Excluir em massa (bulk delete) as mensagens filtradas
    // O bot exclui a própria mensagem de comando, pois ela é a primeira a ser encontrada.
    await channel.bulkDelete(userMessages, true); // O 'true' ignora mensagens com mais de 14 dias

    // 4. Enviar confirmação (usando reply para ser efêmero, mas delete a confirmação logo)
    const confirmation = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`✅ ${count} mensagens suas foram limpas!`)
          .setColor(0x00ff00),
      ],
    });

    // Deletar a mensagem de confirmação após 4 segundos
    setTimeout(() => confirmation.delete().catch(console.error), 4000);
  },
};
