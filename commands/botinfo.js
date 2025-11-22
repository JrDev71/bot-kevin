// commands/botinfo.js
const { EmbedBuilder } = require("discord.js");

module.exports = {
  handleBotInfo: async (message) => {
    const infoEmbed = new EmbedBuilder()
      .setTitle("🤖 MC KEVIN - Sistema Central de Gerenciamento")
      .setDescription(
        "Este bot foi desenvolvido sob medida para garantir a segurança, organização e entretenimento do nosso servidor. Abaixo estão os módulos ativos e suas funcionalidades."
      )
      .setColor(0x2b2d31) // Cor escura/profissional (Discord Dark)
      .setThumbnail(
        message.client.user.displayAvatarURL({ dynamic: true, size: 512 })
      )
      .addFields(
        {
          name: "🛡️ Segurança & Proteção (Automático)",
          value:
            "> **Anti-Nuke:** Monitoramento em tempo real contra destruição de canais e bans em massa.\n" +
            "> **Anti-Spam:** Timeout automático para flood de mensagens.\n" +
            "> **Blindagem de Chat:** Bloqueio de links de convite e menções proibidas (`@everyone`/`@here`).\n" +
            "> **Blacklist & Panela:** Controle rígido de quem entra e proteção para membros VIPs.",
          inline: false,
        },
        {
          name: "💎 Sistema VIP Self-Service",
          value:
            "> Os membros VIPs têm total autonomia através do painel `k!vip`.\n" +
            "> • Criar e editar sua própria **Tag Exclusiva** (Cor e Nome).\n" +
            "> • Criar e gerenciar **Canal de Voz Privado**.\n" +
            "> • Adicionar amigos à sua Tag e Sala (Ilimitado).\n" +
            "> • Sistema de validade e renovação automática.",
          inline: false,
        },
        {
          name: "👮 Moderação Avançada",
          value:
            "> Ferramentas completas para a Staff:\n" +
            "> `Ban` | `Kick` | `Mute` (Temporário) | `Nuke` (Recriar Canal) | `Lockdown` (Trancar Servidor).\n" +
            "> **Sistema Prisional:** Comando `k!prender` para isolar usuários problemáticos.",
          inline: false,
        },
        {
          name: "🎮 Entretenimento: Jogo Stop",
          value:
            "> Um sistema completo de **Adedonha/Stop** integrado ao chat.\n" +
            "> • Múltiplas rodadas automáticas.\n" +
            "> • Validação de respostas.\n" +
            "> • Sistema de revisão e votação pela Staff.\n" +
            "> • Ranking por rodada e placar final acumulado.",
          inline: false,
        },
        {
          name: "✅ Entrada & Verificação",
          value:
            "> Sistema de aprovação manual para novos membros.\n" +
            "> • Formulário via botão com pergunta de referência.\n" +
            "> • Canal exclusivo para Staff aprovar ou rejeitar fichas.",
          inline: false,
        },
        {
          name: "📝 Auditoria Total (Logs)",
          value:
            "> Registro detalhado de tudo o que acontece:\n" +
            "> • Tráfego de Voz (Tempo/Troca) • Mensagens Apagadas/Editadas • Bans/Mutes • Alterações de Cargos e Canais.",
          inline: false,
        },
        {
          name: "👑 Outros Sistemas",
          value:
            "> **PD (Primeira Dama):** Gerenciamento de cargos especiais.\n" +
            "> **Reaction Roles:** Painel para escolha de jogos (Free Fire / Valorant).\n" +
            "> **Utilitários:** Comandos de Avatar e Repetição.",
          inline: false,
        }
      )
      .setImage(
        "https://media.discordapp.net/attachments/1435040616831782922/1435059494228066445/3238061aac6396f0246f33fe01cb283c.jpg?width=450&height=442"
      ) // Sua logo aqui
      .setFooter({
        text: "Desenvolvido exclusivamente para este servidor.",
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    await message.channel.send({ embeds: [infoEmbed] });
  },
};
