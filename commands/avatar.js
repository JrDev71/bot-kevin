// commands/avatar.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// Set para gerenciar cooldown (tempo de espera) localmente
const cooldowns = new Set();

module.exports = {
  /**
   * Função principal para lidar com o comando de avatar
   */
  handleAvatar: async (message, args) => {
    try {
      // --- 1. Identifica o usuário alvo ---
      // Tenta menção -> Tenta ID -> Tenta autor
      let user = message.mentions.users.first();

      if (!user && args.length > 0) {
        try {
          // Tenta buscar pelo ID se não houver menção
          const id = args[0].replace(/<@!?(\d+)>/, "$1");
          user = await message.client.users.fetch(id);
        } catch (e) {
          // Se falhar, user continua null
        }
      }

      if (!user) {
        user = message.author;
      }

      // Busca o membro no servidor para pegar cargos e cores
      const member = await message.guild.members
        .fetch(user.id)
        .catch(() => null);

      // --- 2. Verificação de Cooldown (Anti-Spam) ---
      // Se não for admin, aplica cooldown de 5 segundos
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        if (cooldowns.has(message.author.id)) {
          return message
            .reply({
              content:
                "<:temporizador:1443649098195402865> Aguarde um pouco para usar este comando novamente.",
              ephemeral: true,
            })
            .then((msg) =>
              setTimeout(() => msg.delete().catch(() => {}), 3000)
            );
        }
      }

      // --- 3. Definição Visual (Cor e Ícone) ---
      // Pega a cor do cargo mais alto ou usa cinza padrão
      const avatarColor = member ? member.displayHexColor : "#2F3136";

      // Link para download (PNG)
      const pngLink = user.displayAvatarURL({ extension: "png", size: 4096 });
      // Link para visualização (Dinâmico - GIF se tiver)
      const displayLink = user.displayAvatarURL({ dynamic: true, size: 4096 });

      // --- 4. Criação do Embed ---
      const avatarEmbed = new EmbedBuilder()
        .setAuthor({
          name: `Avatar de ${user.username}`,
          iconURL: displayLink, // Ícone pequeno ao lado do nome
        })
        .setDescription(`[Clique aqui para baixar a imagem](${pngLink})`)
        .setImage(displayLink) // Imagem grande
        .setColor(avatarColor === "#000000" ? "#2F3136" : avatarColor) // Corrige cor preta padrão do Discord
        .setFooter({
          text: `Solicitado por ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await message.channel.send({ embeds: [avatarEmbed] });

      // --- 5. Aplica Cooldown ---
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        cooldowns.add(message.author.id);
        setTimeout(() => {
          cooldowns.delete(message.author.id);
        }, 5000); // 5 segundos de cooldown
      }
    } catch (error) {
      console.error(
        "[AVATAR] <:Nao:1443642030637977743> Erro ao executar o comando:",
        error
      );
      message.channel
        .send({
          content:
            "<:Nao:1443642030637977743> Ocorreu um erro ao tentar buscar o avatar.",
        })
        .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
    }

    return true; // Retorno para o roteador saber que deu certo
  },
};
