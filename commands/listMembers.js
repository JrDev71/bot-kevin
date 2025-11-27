// commands/listMembers.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// Configuração Visual (Padronizada)
const HEADER_IMAGE =
  "https://i.pinimg.com/736x/4d/68/8e/4d688edfeedd4bec17b856d2a2ad7241.jpg";
const NEUTRAL_COLOR = 0x2f3136;

module.exports = {
  handleListMembers: async (message, args) => {
    // 1. Segurança: Apenas quem tem permissão de gerenciar cargos ou admins
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) &&
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply("🔒 Apenas a Staff pode listar membros de cargos.");
    }

    // 2. Identificar o Cargo (ID ou Menção)
    const roleIdentifier = args[0];
    if (!roleIdentifier) {
      return message.reply(
        "❌ Uso correto: `k!membros @cargo` ou `k!membros <ID>`"
      );
    }

    // Tenta achar o cargo
    const roleId = roleIdentifier.replace(/<@&(\d+)>/, "$1");
    const role = message.guild.roles.cache.get(roleId);

    if (!role) {
      return message.reply("❌ Cargo não encontrado.");
    }

    await message.channel.sendTyping();

    // 3. Carregar Membros (Importante: força o fetch para garantir que a lista esteja atualizada)
    await message.guild.members.fetch();

    // Filtra membros com o cargo
    const membersWithRole = role.members.map((m) => m.user.tag); // Pega o Discord Tag
    const total = membersWithRole.length;

    if (total === 0) {
      return message.reply(
        `O cargo **${role.name}** não possui nenhum membro.`
      );
    }

    // 4. Formatar a Lista (Limita a visualização para não estourar o limite do Embed)
    const MAX_DISPLAY = 40; // Mostra os primeiros 40 nomes
    const displayList = membersWithRole.slice(0, MAX_DISPLAY).join("\n");
    const remaining = total - MAX_DISPLAY;

    let description = `**Cargo:** ${role}\n**Total de Membros:** ${total}\n\n${displayList}`;

    if (remaining > 0) {
      description += `\n\n...e mais **${remaining}** membros.`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Lista de Membros`)
      .setDescription(description)
      .setColor(role.hexColor !== "#000000" ? role.hexColor : NEUTRAL_COLOR) // Usa a cor do cargo ou a padrão
      .setImage(HEADER_IMAGE)
      .setFooter({ text: `Solicitado por ${message.author.tag}` })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  },
};
