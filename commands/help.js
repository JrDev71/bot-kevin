// commands/help.js
const { EmbedBuilder } = require("discord.js");

const PREFIX = "k!";

module.exports = {
  handleHelp: async (message) => {
    const helpEmbed = new EmbedBuilder()
      .setTitle("🤖 Manual de Comandos do MC KEVIN")
      .setDescription(
        `Aqui está a lista completa de funcionalidades. O prefixo é \`${PREFIX}\`.`
      )
      .setColor(0x3498db) // Azul
      .setThumbnail(message.client.user.displayAvatarURL())
      .addFields(
        {
          name: "🎮 Jogo Stop (Adedonha)",
          value:
            `\`${PREFIX}stop\` - Inicia uma partida (3 rodadas).\n` +
            `\`${PREFIX}parar\` - Encerra a rodada atual antecipadamente.\n` +
            `*Como jogar: Envie suas respostas separadas por vírgula assim que a rodada começar (Ex: Nome, Cor, Fruta).*`,
        },
        {
          name: "💎 Sistema VIP",
          value:
            `**Membros VIP:**\n` +
            `\`${PREFIX}vip\` - Abre seu Painel de Controle (Criar Tag/Canal).\n` +
            `\`${PREFIX}addvip @amigo\` - Adiciona amigo à sua Tag.\n` +
            `\`${PREFIX}remvip @amigo\` - Remove amigo da sua Tag.\n\n` +
            `**Administração VIP:**\n` +
            `\`${PREFIX}setvip @user [dias]\` - Dá o VIP (Padrão 30 dias).\n` +
            `\`${PREFIX}addtime @user <dias>\` - Renova/Adiciona tempo.\n` +
            `\`${PREFIX}vipadm rem @user\` - Remove VIP e deleta benefícios.`,
        },
        {
          name: "🛡️ Moderação & Canais",
          value:
            `\`${PREFIX}ban @user [motivo]\` - Banir usuário.\n` +
            `\`${PREFIX}unban <id>\` - Desbanir pelo ID.\n` +
            `\`${PREFIX}kick @user [motivo]\` - Expulsar usuário.\n` +
            `\`${PREFIX}mute @user <tempo> [motivo]\` - Castigo (Ex: 10m, 1h).\n` +
            `\`${PREFIX}unmute @user\` - Remover castigo.\n` +
            `\`${PREFIX}lock\` / \`${PREFIX}unlock\` - Trancar/Destrancar canal atual.\n` +
            `\`${PREFIX}lockall\` - 🚨 Tranca TODOS os canais (Anti-Raid).\n` +
            `\`${PREFIX}nuke\` - Recria o canal (Limpa histórico).`,
        },
        {
          name: "👮 Segurança & Prisão",
          value:
            `\`${PREFIX}prender @user\` - Envia para a prisão (Cargo Jail).\n` +
            `\`${PREFIX}soltar @user\` - Solta da prisão.\n` +
            `\`${PREFIX}panela add/rem/list\` - Gerencia usuários imunes a ban.\n` +
            `\`${PREFIX}blacklist add/rem/list\` - Gerencia Lista Negra (Auto-Ban).`,
        },
        {
          name: "👑 Primeira Dama (PD)",
          value:
            `\`${PREFIX}pd\` - Lista as PDs atuais.\n` +
            `\`${PREFIX}setpd @user\` - Define uma nova PD.\n` +
            `\`${PREFIX}removepd @user\` - Remove uma PD.`,
        },
        {
          name: "⚙️ Outros / Setup",
          value:
            `\`${PREFIX}av [@user]\` - Ver avatar grande.\n` +
            `\`${PREFIX}roles\` - Posta o Painel de Registro.\n` +
            `\`${PREFIX}repeat <texto>\` - O bot fala por você.`,
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
