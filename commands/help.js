// commands/help.js
const { EmbedBuilder } = require("discord.js");

const PREFIX = "k!";

module.exports = {
  handleHelp: async (message) => {
    const helpEmbed = new EmbedBuilder()
      .setTitle("🤖 Manual de Comandos do MC KEVIN")
      .setDescription(
        `Aqui está a lista de todos os comandos disponíveis. O prefixo do bot é \`${PREFIX}\`.`
      )
      .setColor(0x3498db) // Azul
      .setThumbnail(message.client.user.displayAvatarURL())
      .addFields(
        {
          name: "🎮 Jogo Stop",
          value:
            `\`${PREFIX}stop\` - Inicia uma nova partida (3 rodadas).\n` +
            `\`${PREFIX}parar\` - Encerra a rodada atual antecipadamente.\n` +
            `*Para jogar: Envie suas respostas separadas por vírgula assim que a rodada começar.*`,
        },
        {
          name: "💎 Sistema VIP (Membros)",
          value:
            `\`${PREFIX}vip\` - Abre o Painel de Controle VIP (Criar Tag/Canal).\n` +
            `\`${PREFIX}addvip @membro\` - Adiciona um amigo à sua Tag VIP.\n` +
            `\`${PREFIX}remvip @membro\` - Remove um amigo da sua Tag VIP.`,
        },
        {
          name: "👑 Sistema PD (Primeira Dama)",
          value:
            `\`${PREFIX}pd\` - Mostra a lista de Primeiras Damas atuais.\n` +
            `\`${PREFIX}setpd @membro\` - (Staff) Define uma nova PD.\n` +
            `\`${PREFIX}removepd @membro\` - (Staff) Remove uma PD.`,
        },
        {
          name: "🛡️ Moderação Básica",
          value:
            `\`${PREFIX}ban @membro [motivo]\` - Bane um usuário.\n` +
            `\`${PREFIX}unban <id>\` - Desbane um usuário pelo ID.\n` +
            `\`${PREFIX}kick @membro [motivo]\` - Expulsa um usuário.\n` +
            `\`${PREFIX}mute @membro <tempo> [motivo]\` - Aplica castigo (Ex: 10m, 1h).\n` +
            `\`${PREFIX}unmute @membro\` - Remove o castigo.\n` +
            `\`${PREFIX}nuke\` - Recria o canal atual (Limpa tudo).`,
        },
        {
          name: "🚔 Prisão & Proteção (Admin)",
          value:
            `\`${PREFIX}prender @membro\` - Envia o membro para a prisão (Cargo Jail).\n` +
            `\`${PREFIX}soltar @membro\` - Remove da prisão.\n` +
            `\`${PREFIX}panela add/rem/list\` - Gerencia usuários imunes a ban (Anti-ban).\n` +
            `\`${PREFIX}blacklist add/rem/list\` - Gerencia lista negra de usuários.`,
        },
        {
          name: "⚙️ Administração & Setup",
          value:
            `\`${PREFIX}roles\` - Posta o Painel de Reação por Cargo.\n` +
            `\`${PREFIX}vipadm add/rem @membro\` - Dá/Remove o plano VIP de alguém.\n` +
            `\`${PREFIX}repeat <texto>\` - Faz o bot repetir uma mensagem.`,
        },
        {
          name: "👤 Utilidades",
          value: `\`${PREFIX}av [@membro]\` - Mostra o avatar grande de um usuário.`,
        }
      )
      .setFooter({
        text: `Solicitado por ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    await message.channel.send({ embeds: [helpEmbed] });
  },
};
