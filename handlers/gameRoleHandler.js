// handlers/gameRoleHandler.js
const { EmbedBuilder } = require("discord.js");

// Configuração Visual
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const NEUTRAL_COLOR = 0x2f3136;

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

  // Se o botão clicado não for de jogo, retorna false para o interactionCreate tentar outro handler
  if (!gameButtons.includes(customId)) return false;

  await interaction.deferReply({ ephemeral: true });

  const config = interaction.client.config;

  // Mapa de Botão -> ID do Cargo (Configurado no .env)
  const roleMap = {
    btn_role_ff: config.FREEFIRE_ROLE_ID,
    btn_role_val: config.VALORANT_ROLE_ID,
    btn_role_cs: config.CS_ROLE_ID,
    btn_role_roblox: config.ROBLOX_ROLE_ID,
    btn_role_gta: config.GTA_ROLE_ID,
    btn_role_mine: config.MINECRAFT_ROLE_ID,
  };

  const roleId = roleMap[customId];

  const createResponse = (desc, color) => {
    return new EmbedBuilder()
      .setDescription(desc)
      .setColor(color)
      .setImage(HEADER_IMAGE)
      .setTimestamp();
  };

  if (!roleId) {
    return interaction.editReply({
      embeds: [
        createResponse(
          "⚠️ Erro: O ID deste cargo não foi configurado no `.env`.",
          0xffa500
        ),
      ],
    });
  }

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.editReply({
      embeds: [
        createResponse(
          "❌ Erro: O cargo não existe mais no servidor.",
          0xff0000
        ),
      ],
    });
  }

  const hasRole = interaction.member.roles.cache.has(roleId);

  try {
    if (hasRole) {
      await interaction.member.roles.remove(roleId);
      interaction.editReply({
        embeds: [
          createResponse(
            `➖ Cargo **${role.name}** removido com sucesso.`,
            0xe74c3c
          ),
        ],
      });
    } else {
      await interaction.member.roles.add(roleId);
      interaction.editReply({
        embeds: [
          createResponse(
            `➕ Cargo **${role.name}** adicionado ao seu perfil!`,
            0x2ecc71
          ),
        ],
      });
    }
  } catch (error) {
    console.error("Erro Auto-Role:", error);
    interaction.editReply({
      embeds: [
        createResponse(
          "❌ Erro de Permissão. Meu cargo precisa estar acima dos cargos de jogos na lista do servidor.",
          0xff0000
        ),
      ],
    });
  }

  return true;
};
