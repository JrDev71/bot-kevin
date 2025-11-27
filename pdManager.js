// pdManager.js
const { EmbedBuilder } = require("discord.js");
const logEmbed = require("./utils/logEmbed");
const prisma = require("./database"); // Conexão com o Banco de Dados

const MAX_PDS_PER_STAFF = 2;
const PREFIX = "k!";

// IDs e Configurações
const PD_ROLE_ID = "1435040530701746236";
const PD_PERMITTED_ROLES = [
  "1435040516814147715",
  "1435040517665853571",
  "1435040518571819099",
  "1435040519918059521",
];

// Configuração Visual (Padronizada)
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

// --- UTILITY ---
const createFeedbackEmbed = (title, description, color = COLOR_NEUTRAL) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setImage(HEADER_IMAGE)
    .setTimestamp();
};

// --- Funções de Gerenciamento de Dados (PRISMA / DB) ---

/**
 * Retorna a lista de todas as PDs do banco.
 */
async function getPdData() {
  try {
    const pds = await prisma.pd.findMany();
    return { pds };
  } catch (e) {
    console.error("[DB ERROR] getPdData:", e);
    return { pds: [] };
  }
}

/**
 * Adiciona uma nova Primeira Dama (PD) no banco.
 */
async function addPd(pdMemberId, staffMemberId) {
  try {
    // 1. Checa se o membro já é PD
    const existing = await prisma.pd.findUnique({
      where: { memberId: pdMemberId },
    });
    if (existing) {
      return { success: false, message: "Este membro já é uma Primeira Dama." };
    }

    // 2. Checa o limite do Staff
    const currentCount = await prisma.pd.count({
      where: { staffId: staffMemberId },
    });

    if (currentCount >= MAX_PDS_PER_STAFF) {
      return {
        success: false,
        message: `Você já indicou o limite de ${MAX_PDS_PER_STAFF} Primeiras Damas.`,
      };
    }

    // 3. Cria no Banco
    await prisma.pd.create({
      data: {
        memberId: pdMemberId,
        staffId: staffMemberId,
        since: new Date(),
      },
    });

    return { success: true, message: "Primeira Dama adicionada com sucesso." };
  } catch (e) {
    console.error("[DB ERROR] addPd:", e);
    return { success: false, message: "Erro de conexão com o banco de dados." };
  }
}

/**
 * Remove uma PD do banco pelo ID do membro.
 */
async function removePd(memberIdToRemove) {
  try {
    const pdToRemove = await prisma.pd.findUnique({
      where: { memberId: memberIdToRemove },
    });

    if (!pdToRemove) {
      return { success: false, pdToRemove: null };
    }

    await prisma.pd.delete({
      where: { memberId: memberIdToRemove },
    });

    return { success: true, pdToRemove };
  } catch (e) {
    console.error("[DB ERROR] removePd:", e);
    return { success: false, pdToRemove: null };
  }
}

// --- ROTEADOR E HANDLER DE COMANDOS PD ---

async function handlePDCommand(message, command, args) {
  // Carrega dados (Await necessário pois vem do banco)
  const pdData = await getPdData();
  const client = message.client;
  const authorTag = message.author.tag;

  const logChannelId =
    client.config.PD_LOG_CHANNEL_ID || client.config.LOG_CHANNEL_ID;

  // --- Comando: k!pd (LISTAR) ---
  if (command === "pd") {
    if (pdData.pds.length === 0) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "<:designcoroa:1443638142430085140> Primeiras Damas",
            "Atualmente, não há nenhuma Primeira Dama definida.",
            0x00bfff
          ),
        ],
      });
    }

    const pdEmbed = new EmbedBuilder()
      .setTitle(
        `<:designcoroa:1443638142430085140> Primeiras Damas Atuais do Servidor`
      )
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE);

    for (const [index, pd] of pdData.pds.entries()) {
      const pdMember = await message.guild.members
        .fetch(pd.memberId)
        .catch(() => null);
      const staffUser = await client.users.fetch(pd.staffId).catch(() => null);

      const staffTag = staffUser ? staffUser.tag : "Dono Desconhecido";
      const sinceDate = new Date(pd.since).toLocaleDateString("pt-BR");

      if (pdMember) {
        pdEmbed.addFields({
          name: `<:dama:1443703932835594430> #${index + 1}: ${
            pdMember.displayName
          }`,
          value: `**Definida por:** ${staffTag}\n**Desde:** ${sinceDate}`,
          inline: true,
        });

        if (index === 0) {
          pdEmbed.setThumbnail(
            pdMember.user.displayAvatarURL({ dynamic: true, size: 256 })
          );
        }
      } else {
        pdEmbed.addFields({
          name: `<:Nao:1443642030637977743> PD Antiga (Membro saiu)`,
          value: `ID: ${pd.memberId} (Indicada por: ${staffTag})`,
          inline: true,
        });
      }
    }

    await message.channel.send({ embeds: [pdEmbed] });
    return;
  }

  // --- Comando: k!setpd (@membro ou ID) ---
  if (command === "setpd") {
    const isPermitted = message.member.roles.cache.some((role) =>
      PD_PERMITTED_ROLES.includes(role.id)
    );

    if (!isPermitted) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "<:cadeado:1443642375833518194> Sem Permissão",
            `Você não tem permissão para definir a Primeira Dama.`
          ),
        ],
      });
    }

    const memberIdentifier = args[0];
    let newPdMember = message.mentions.members.first();

    // Busca por ID se não houver menção
    if (!newPdMember && memberIdentifier) {
      const rawId = memberIdentifier.replace(/<@!?(\d+)>/, "$1");
      if (/^\d+$/.test(rawId)) {
        newPdMember = await message.guild.members
          .fetch(rawId)
          .catch(() => null);
      }
    }

    if (!newPdMember) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❓ Uso Incorreto",
            `Uso correto: \`${PREFIX}setpd @membro ou <ID do membro>\`.`
          ),
        ],
      });
    }

    const pdRoleId = PD_ROLE_ID;
    const pdRole = message.guild.roles.cache.get(pdRoleId);

    if (!pdRole) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "<:fogo:1443642901866217586> Erro Crítico",
            "O cargo de Primeira Dama não está configurado corretamente. Verifique o PD_ROLE_ID."
          ),
        ],
      });
    }

    // ADICIONA AO BANCO (ASYNC)
    const { success, message: managerMessage } = await addPd(
      newPdMember.id,
      message.author.id
    );

    if (!success) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "<:Nao:1443642030637977743> Ação Bloqueada",
            managerMessage
          ),
        ],
      });
    }

    try {
      // 1. Dá o cargo
      await newPdMember.roles.add(pdRole);

      // 2. Conta quantas PDs esse staff tem
      const count = await prisma.pd.count({
        where: { staffId: message.author.id },
      });
      const remaining = MAX_PDS_PER_STAFF - count;

      const successEmbed = createFeedbackEmbed(
        "<:certo_froid:1443643346722754692> Sucesso!",
        `O Dono **${authorTag}** indicou ${newPdMember.user.tag} como uma **Primeira Dama**!\n\n` +
          `Você ainda pode indicar mais **${
            remaining >= 0 ? remaining : 0
          }** PDs.`,
        0x00ff00
      );

      await message.channel.send({ embeds: [successEmbed] });

      // 3. Log de Auditoria
      await logEmbed(
        client,
        logChannelId,
        "<:designcoroa:1443638142430085140> Nova Primeira Dama Definida",
        `**${newPdMember.user.tag}** foi promovida a Primeira Dama.`,
        0xf1c40f,
        [
          {
            name: "<:dama:1443703932835594430> PD",
            value: `<@${newPdMember.id}>`,
            inline: true,
          },
          {
            name: "👮 Indicada por",
            value: `<@${message.author.id}>`,
            inline: true,
          },
          { name: "🔢 Vagas Restantes", value: `${remaining}`, inline: true },
        ],
        newPdMember.user.displayAvatarURL()
      );
    } catch (error) {
      console.error("Erro ao adicionar cargo de PD:", error);
      await removePd(newPdMember.id); // Reverte o banco se falhar no Discord
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "<:Nao:1443642030637977743> Erro de Permissão",
            "Não foi possível adicionar o cargo PD. Verifique a hierarquia do bot."
          ),
        ],
      });
    }
    return;
  }

  // --- Comando: k!removepd (@membro ou ID) ---
  if (command === "removepd") {
    const isPermitted = message.member.roles.cache.some((role) =>
      PD_PERMITTED_ROLES.includes(role.id)
    );

    if (!isPermitted) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "<:cadeado:1443642375833518194> Sem Permissão",
            `Você não tem permissão para remover a Primeira Dama.`
          ),
        ],
      });
    }

    const memberIdentifier = args[0];
    let targetMember = message.mentions.members.first();

    if (!targetMember && memberIdentifier) {
      const rawId = memberIdentifier.replace(/<@!?(\d+)>/, "$1");
      if (/^\d+$/.test(rawId)) {
        targetMember = await message.guild.members
          .fetch(rawId)
          .catch(() => null);
      }
    }

    if (!targetMember) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❓ Uso Incorreto",
            `Uso correto: \`${PREFIX}removepd @membro ou <ID do membro>\`.`
          ),
        ],
      });
    }

    const pdRoleId = PD_ROLE_ID;
    const pdRole = message.guild.roles.cache.get(pdRoleId);

    // Tenta remover do banco primeiro
    const { success, pdToRemove } = await removePd(targetMember.id);

    // Se o membro tem o cargo no Discord, tenta tirar mesmo se não estiver no banco (limpeza)
    let roleRemoved = false;
    if (targetMember.roles.cache.has(pdRoleId)) {
      try {
        await targetMember.roles.remove(pdRole);
        roleRemoved = true;
      } catch (e) {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "<:Nao:1443642030637977743> Erro de Permissão",
              "Não consegui remover o cargo no Discord. Verifique a hierarquia."
            ),
          ],
        });
      }
    }

    if (!success) {
      if (roleRemoved) {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "⚠️ Aviso",
              `O membro tinha o cargo (foi removido), mas não estava registrado no banco de dados.`
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "<:Nao:1443642030637977743> Não Encontrado",
              `Este membro não é uma PD e não tem o cargo.`
            ),
          ],
        });
      }
    }

    // Recupera quem indicou para o log
    const staffTag = pdToRemove?.staffId
      ? (await client.users.fetch(pdToRemove.staffId).catch(() => null))?.tag
      : "Staff Desconhecido";

    const removalEmbed = createFeedbackEmbed(
      "<:red_corao_partido:1443645777858662521> PD Removida",
      `${targetMember.user.tag} foi removido(a) como Primeira Dama por **${authorTag}**.`,
      0xdc7633
    );

    await message.channel.send({ embeds: [removalEmbed] });

    // Log de Auditoria
    await logEmbed(
      client,
      logChannelId,
      "<:red_corao_partido:1443645777858662521> Primeira Dama Removida",
      `**${targetMember.user.tag}** perdeu o status de Primeira Dama.`,
      0xe74c3c,
      [
        {
          name: "<:dama:1443703932835594430> Ex-PD",
          value: `<@${targetMember.id}>`,
          inline: true,
        },
        {
          name: "👮 Removido por",
          value: `<@${message.author.id}>`,
          inline: true,
        },
        { name: "📜 Indicada por", value: staffTag, inline: true },
      ],
      targetMember.user.displayAvatarURL()
    );
    return;
  }
}

module.exports = {
  handlePDCommand,
  getPdData,
  addPd,
  removePd,
  MAX_PDS_PER_STAFF,
};
