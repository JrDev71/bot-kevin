// handlers/gameRoleHandler.js
const { EmbedBuilder } = require("discord.js");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return false;

  const { customId } = interaction;

  // Lista de botões que este handler gerencia
  const gameButtons = [
    "btn_role_ff",
    "btn_role_val",
    "btn_role_cs",
    "btn_role_gta",
    "btn_role_roblox",
    "btn_role_mine",
  ];

  if (!gameButtons.includes(customId)) return false;

  await interaction.deferReply({ ephemeral: true });

  const config = interaction.client.config;

  // Mapa de Botão -> ID do Cargo (Do .env)
  const roleMap = {
    btn_role_ff: config.FREEFIRE_ROLE_ID,
    btn_role_val: config.VALORANT_ROLE_ID,
    btn_role_cs: config.CS_ROLE_ID,
    btn_role_roblox: config.ROBLOX_ROLE_ID,
    btn_role_gta: config.GTA_ROLE_ID,
    btn_role_mine: config.MINECRAFT_ROLE_ID,
  };

  const roleId = roleMap[customId];

  if (!roleId) {
    return interaction.editReply(
      "⚠️ Erro: O ID deste cargo não foi configurado no `.env`."
    );
  }

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.editReply(
      "❌ Erro: O cargo não existe mais no servidor."
    );
  }

  const hasRole = interaction.member.roles.cache.has(roleId);

  try {
    if (hasRole) {
      await interaction.member.roles.remove(roleId);
      interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`➖ Cargo **${role.name}** removido.`)
            .setColor(0xe74c3c),
        ],
      });
    } else {
      await interaction.member.roles.add(roleId);
      interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`➕ Cargo **${role.name}** adicionado!`)
            .setColor(0x2ecc71),
        ],
      });
    }
  } catch (error) {
    console.error("Erro Auto-Role:", error);
    interaction.editReply(
      "❌ Erro de Permissão. Meu cargo precisa estar acima dos cargos de jogos."
    );
  }

  return true;
};
