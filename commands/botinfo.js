// commands/botinfo.js
const { EmbedBuilder } = require("discord.js");

// CONFIG VISUAL PADRÃO
const HEADER_IMAGE =
  "https://i.pinimg.com/736x/80/aa/bc/80aabcdc9d61a5e0e79ed6383de84342.jpg";
const COLOR_NEUTRAL = 0x2f3136;

module.exports = {
  handleBotInfo: async (message) => {
    const infoEmbed = new EmbedBuilder()
      .setTitle("🤖 MC KEVIN - Sistema Central")
      .setDescription(
        "Bot desenvolvido exclusivamente para gerenciamento, segurança e entretenimento deste servidor.\n" +
          "Abaixo estão os módulos ativos e suas funcionalidades."
      )
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE)
      .setThumbnail(
        message.client.user.displayAvatarURL({ dynamic: true, size: 512 })
      )
      .addFields(
        {
          name: "🛡️ Segurança Zero Trust",
          value:
            "> **Anti-Nuke:** Proteção contra destruição de canais e bans em massa.\n" +
            "> **Anti-Spam:** Timeout automático para flood.\n" +
            "> **Chat Blindado:** Bloqueio de links e menções (`@everyone`/`@here`).\n" +
            "> **Listas de Acesso:** Sistema de Panela (Anti-Ban) e Blacklist.",
          inline: false,
        },
        {
          name: "🎛️ Gestão via Painéis (Staff)",
          value:
            "> Gerenciamento visual sem comandos complexos:\n" +
            "> `k!mod` - Painel de Justiça (Punir, Limpar, Trancar).\n" +
            "> `k!canal` - Infraestrutura (Criar/Editar canais com permissão automática).\n" +
            "> `k!cargo` - Gestão de Hierarquia (Criar/Editar cargos).",
          inline: false,
        },
        {
          name: "💎 Sistema VIP Self-Service",
          value:
            "> Membros VIPs gerenciam seus próprios benefícios via `k!vip`:\n" +
            "> • Criar Tag Exclusiva e Canal de Voz Privado.\n" +
            "> • Adicionar amigos à Tag/Sala (Ilimitado).\n" +
            "> • Sistema de expiração e renovação automática.",
          inline: false,
        },
        {
          name: "🎮 Jogo Stop (Adedonha)",
          value:
            "> Jogo automático integrado ao chat:\n" +
            "> • Múltiplas rodadas e Placar Acumulado.\n" +
            "> • Validação por Votação/Revisão da Staff.\n" +
            "> • Comandos: `k!stop` (Iniciar) e `k!parar`.",
          inline: false,
        },
        {
          name: "📝 Auditoria & Logs",
          value:
            "> Registro total de ações em canais dedicados:\n" +
            "> Voz, Mensagens, Cargos, Entradas/Saídas e Punições.",
          inline: false,
        },
        {
          name: "🔧 Utilitários",
          value:
            "> `k!membros @cargo` - Lista quem possui um cargo.\n" +
            "> `k!av @user` - Visualiza o avatar.\n" +
            "> `k!pd` - Sistema de Primeira Dama.\n" +
            "> `k!help` - Lista completa de comandos.",
          inline: false,
        }
      )
      .setFooter({
        text: "Sistema Privado v3.0",
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    await message.channel.send({ embeds: [infoEmbed] });
  },
};
