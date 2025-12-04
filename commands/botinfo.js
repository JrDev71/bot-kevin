// commands/botinfo.js
const { EmbedBuilder } = require("discord.js");

// CONFIG VISUAL PADRÃO
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

module.exports = {
  handleBotInfo: async (message) => {
    const infoEmbed = new EmbedBuilder()
      .setTitle("🤖 MC KEVIN - Sistema Central")
      .setDescription(
        "Bot exclusivo de gerenciamento, segurança e economia.\n" +
          "Todos os sistemas são integrados e salvos em nuvem."
      )
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE)
      .setThumbnail(
        message.client.user.displayAvatarURL({ dynamic: true, size: 512 })
      )
      .addFields(
        {
          name: "💰 Economia & Cassino",
          value:
            "> **Sistema Bancário:** Carteira, Banco e Transferências (Pix).\n" +
            "> **Jobs:** Comandos de `Daily` e `Work` com cooldown.\n" +
            "> **Jogos de Azar:** `Slots` (Caça-níquel) e `Mines` (Campo Minado) 100% interativo.",
          inline: false,
        },
        {
          name: "🛡️ Segurança Zero Trust",
          value:
            "> **Anti-Nuke & Anti-Raid:** Proteção automática contra destruição.\n" +
            "> **Chat Blindado:** Anti-Link, Anti-Spam e Filtro de Menções.\n" +
            "> **Listas:** Blacklist (Ban na entrada) e Panela (Imunidade).",
          inline: false,
        },
        {
          name: "💎 Sistema VIP & PD",
          value:
            "> **VIP Self-Service:** O usuário cria sua Tag e Canal sozinho.\n" +
            "> **Gerenciamento:** Adição ilimitada de amigos na Tag.\n" +
            "> **Primeira Dama:** Sistema exclusivo de cargos especiais.",
          inline: false,
        },
        {
          name: "🎛️ Gestão por Painéis",
          value:
            "> A Staff não usa comandos complexos, usa Painéis Visuais:\n" +
            "> `Moderação` • `Infraestrutura` • `Cargos` • `Verificação`.",
          inline: false,
        },
        {
          name: "📝 Auditoria Total",
          value: "> Logs detalhados de Voz, Mensagens, Punições e Edições.",
          inline: false,
        }
      )
      .setFooter({
        text: "Versão 4.0 Stable • Database PostgreSQL",
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    await message.channel.send({ embeds: [infoEmbed] });
  },
};
