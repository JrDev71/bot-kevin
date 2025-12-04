// commands/help.js
const { EmbedBuilder } = require("discord.js");

const PREFIX = "k!";
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

module.exports = {
  handleHelp: async (message) => {
    const helpEmbed = new EmbedBuilder()
      .setTitle("🤖 Manual de Comandos")
      .setDescription(
        `Lista completa de funcionalidades do servidor.\nO prefixo é \`${PREFIX}\`.`
      )
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE)
      .setThumbnail(message.client.user.displayAvatarURL())
      .addFields(
        {
          name: "💰 Economia & Cassino",
          value:
            `\`${PREFIX}atm\` - Ver seu saldo (Carteira e Banco).\n` +
            `\`${PREFIX}daily\` - Resgatar recompensa diária.\n` +
            `\`${PREFIX}work\` - Trabalhar para ganhar dinheiro.\n` +
            `\`${PREFIX}pay @user <valor>\` - Transferir dinheiro.\n` +
            `\`${PREFIX}rank\` - Ver o Ranking dos mais ricos.\n` +
            `\`${PREFIX}slot <valor>\` - Apostar no Caça-Níquel.\n` +
            `\`${PREFIX}mines <valor> [bombas]\` - Jogar Campo Minado.`,
        },
        {
          name: "💎 Sistema VIP",
          value:
            `\`${PREFIX}vip\` - Seu Painel (Criar Tag/Canal).\n` +
            `\`${PREFIX}addvip @amigo\` - Adicionar amigo à Tag.\n` +
            `\`${PREFIX}remvip @amigo\` - Remover amigo da Tag.\n` +
            `*Staff:* \`${PREFIX}setvip\`, \`${PREFIX}addtime\`, \`${PREFIX}vipadm\`.`,
        },
        {
          name: "🎮 Jogo Stop",
          value:
            `\`${PREFIX}stop\` - Iniciar partida.\n` +
            `\`${PREFIX}parar\` - Encerrar rodada.\n` +
            `*Responda rápido no chat quando a letra sair!*`,
        },
        {
          name: "🛡️ Segurança & Moderação",
          value:
            `\`${PREFIX}mod\` - **Painel de Justiça** (Ban/Kick/Mute).\n` +
            `\`${PREFIX}canal\` - **Painel de Infra** (Criar Canais).\n` +
            `\`${PREFIX}cargo\` - **Painel de Cargos** (Criar Cargos).\n` +
            `\`${PREFIX}lockall\` / \`${PREFIX}unlockall\` - Trancar/Destrancar Servidor.\n` +
            `\`${PREFIX}panela\` / \`${PREFIX}blacklist\` - Listas de Proteção.`,
        },
        {
          name: "⚙️ Admin & Outros",
          value:
            `\`${PREFIX}roles\` - Painel de Auto-Role (Jogos).\n` +
            `\`${PREFIX}eco add/rem @user <valor>\` - Gerenciar saldo de membros.\n` +
            `\`${PREFIX}av @user\` - Ver avatar.\n` +
            `\`${PREFIX}pd\` - Sistema de Primeira Dama.`,
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
