// pdManager.js
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
const logEmbed = require("./utils/logEmbed");

// Caminho para o arquivo de banco de dados JSON
const PD_FILE = path.resolve(__dirname, "pdData.json");
const MAX_PDS_PER_STAFF = 2;
const PREFIX = "k!";

// IDs hardcoded
const PD_ROLE_ID = "1435040530701746236";
const PD_PERMITTED_ROLES = [
  "1435040516814147715",
  "1435040517665853571",
  "1435040518571819099",
  "1435040519918059521",
];

// --- UTILITY ---
const createFeedbackEmbed = (title, description, color = 0xff0000) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
};

// --- Funções Auxiliares de Persistência ---

function loadPdData() {
  if (!fs.existsSync(PD_FILE)) {
    return { pds: [], staffCount: {} };
  }
  try {
    const data = fs.readFileSync(PD_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Erro ao ler pdData.json:", e);
    return { pds: [], staffCount: {} };
  }
}

function savePdData(data) {
  fs.writeFileSync(PD_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// --- Funções de Gerenciamento de Dados ---

function getPdData() {
  return loadPdData();
}

function addPd(pdMemberId, staffMemberId) {
  const data = loadPdData();

  // 1. Checa se o membro já é PD
  if (data.pds.some((pd) => pd.memberId === pdMemberId)) {
    return { success: false, message: "Este membro já é uma Primeira Dama." };
  }

  // 2. Checa o limite do Staff
  const currentCount = data.staffCount[staffMemberId] || 0;
  if (currentCount >= MAX_PDS_PER_STAFF) {
    return {
      success: false,
      message: `Você já indicou o limite de ${MAX_PDS_PER_STAFF} Primeiras Damas.`,
    };
  }

  // 3. Adiciona a nova PD
  data.pds.push({
    memberId: pdMemberId,
    staffId: staffMemberId,
    since: Date.now(),
  });

  // 4. Atualiza a contagem do Staff
  data.staffCount[staffMemberId] = currentCount + 1;

  savePdData(data);
  return { success: true, message: "Primeira Dama adicionada com sucesso." };
}

function removePd(memberIdToRemove) {
  const data = loadPdData();

  const index = data.pds.findIndex((pd) => pd.memberId === memberIdToRemove);
  if (index === -1) {
    return { success: false, pdToRemove: null };
  }

  const pdToRemove = data.pds[index];

  // 1. Remove a PD da lista
  data.pds.splice(index, 1);

  // 2. Atualiza a contagem do Staff
  const staffId = pdToRemove.staffId;
  if (data.staffCount[staffId] > 0) {
    data.staffCount[staffId] -= 1;
    if (data.staffCount[staffId] === 0) {
      delete data.staffCount[staffId];
    }
  }

  savePdData(data);
  return { success: true, pdToRemove: pdToRemove };
}

// --- ROTEADOR E HANDLER DE COMANDOS PD ---

async function handlePDCommand(message, command, args) {
  const pdData = getPdData();
  const client = message.client;
  const authorTag = message.author.tag;

  const logChannelId =
    client.config.PD_LOG_CHANNEL_ID || client.config.LOG_CHANNEL_ID;

  // --- Comando: k!pd (Visualizar PDs Atuais) ---
  if (command === "pd") {
    if (pdData.pds.length === 0) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "👑 Primeiras Damas",
            "Atualmente, não há nenhuma Primeira Dama definida.",
            0x00bfff
          ),
        ],
      });
    }

    const pdEmbed = new EmbedBuilder()
      .setTitle(`👑 Primeiras Damas Atuais do Servidor`)
      .setColor(0xffa500);

    // Loop para adicionar os campos
    for (const [index, pd] of pdData.pds.entries()) {
      const pdMember = await message.guild.members
        .fetch(pd.memberId)
        .catch(() => null);
      const staffUser = await client.users.fetch(pd.staffId).catch(() => null);

      const staffTag = staffUser ? staffUser.tag : "Staff Desconhecido";
      const sinceDate = new Date(pd.since).toLocaleDateString("pt-BR");

      if (pdMember) {
        const pdName = pdMember.displayName;

        pdEmbed.addFields({
          name: `👸 #${index + 1}: ${pdName}`,
          value: `**Indicada por:** ${staffTag}\n**Desde:** ${sinceDate}`,
          inline: true,
        });

        if (index === 0) {
          pdEmbed.setThumbnail(
            pdMember.user.displayAvatarURL({ dynamic: true, size: 256 })
          );
        }
      } else {
        pdEmbed.addFields({
          name: `❌ PD Antiga (Membro saiu)`,
          value: `ID: ${pd.memberId} (Indicada por: ${staffTag})`,
          inline: true,
        });
      }
    }

    // CORREÇÃO: Envio da mensagem FORA do loop
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
            "🔒 Sem Permissão",
            `Você não tem permissão para definir a Primeira Dama.`
          ),
        ],
      });
    }

    const memberIdentifier = args[0];
    let newPdMember = message.mentions.members.first();

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
      console.error("Erro: Cargo PD_ROLE_ID não encontrado.");
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "🔥 Erro Crítico",
            "O cargo de Primeira Dama não está configurado corretamente. Verifique o PD_ROLE_ID."
          ),
        ],
      });
    }

    const { success, message: managerMessage } = addPd(
      newPdMember.id,
      message.author.id
    );

    if (!success) {
      return message.channel.send({
        embeds: [createFeedbackEmbed("❌ Limite Atingido", managerMessage)],
      });
    }

    try {
      await newPdMember.roles.add(pdRole);

      const remaining =
        MAX_PDS_PER_STAFF - (getPdData().staffCount[message.author.id] || 0);

      const successEmbed = createFeedbackEmbed(
        "✅ Sucesso!",
        `A Staff **${authorTag}** indicou ${newPdMember.user.tag} como uma **Primeira Dama**!\n\n` +
          `Você ainda pode indicar mais **${remaining}** PDs.`,
        0x00ff00
      );

      await message.channel.send({ embeds: [successEmbed] });

      await logEmbed(
        client,
        logChannelId,
        "👑 Nova Primeira Dama Definida",
        `**${newPdMember.user.tag}** foi promovida a Primeira Dama.`,
        0xf1c40f,
        [
          { name: "👸 PD", value: `<@${newPdMember.id}>`, inline: true },
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
      removePd(newPdMember.id);
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❌ Erro de Permissão",
            "Não foi possível adicionar o cargo PD. Verifique se o cargo do bot está acima do cargo de Primeira Dama."
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
            "🔒 Sem Permissão",
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

    if (!targetMember.roles.cache.has(pdRoleId)) {
      const { success } = removePd(targetMember.id);
      if (success) {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "✅ Sucesso",
              `Membro sem o cargo PD, mas o registro foi limpo do sistema.`,
              0x00ff00
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "❌ Não Registrado",
              `O membro ${targetMember.user.tag} não está registrado no sistema PD.`
            ),
          ],
        });
      }
    }

    const { success, pdToRemove } = removePd(targetMember.id);

    if (!success) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❌ Erro",
            "Este membro está com o cargo, mas não está listado como uma Primeira Dama no sistema."
          ),
        ],
      });
    }

    try {
      await targetMember.roles.remove(pdRole);

      const staffTag = pdToRemove.staffId
        ? (await client.users.fetch(pdToRemove.staffId).catch(() => null))?.tag
        : "Staff Desconhecido";
      const logMessage = pdToRemove
        ? `(Indicada por: ${staffTag}, desde: ${new Date(
            pdToRemove.since
          ).toLocaleDateString("pt-BR")})`
        : "";

      const removalEmbed = createFeedbackEmbed(
        "💔 PD Removida",
        `${targetMember.user.tag} foi removido(a) como Primeira Dama por **${authorTag}**.\n\n${logMessage}`,
        0xdc7633
      );

      await message.channel.send({ embeds: [removalEmbed] });

      await logEmbed(
        client,
        logChannelId,
        "💔 Primeira Dama Removida",
        `**${targetMember.user.tag}** perdeu o status de Primeira Dama.`,
        0xe74c3c,
        [
          { name: "👸 Ex-PD", value: `<@${targetMember.id}>`, inline: true },
          {
            name: "👮 Removido por",
            value: `<@${message.author.id}>`,
            inline: true,
          },
          {
            name: "📜 Indicada Originalmente por",
            value: staffTag,
            inline: true,
          },
        ],
        targetMember.user.displayAvatarURL()
      );
    } catch (error) {
      console.error("Erro ao remover cargo de PD:", error);
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "❌ Erro de Permissão",
            "Não foi possível remover o cargo PD. Verifique as permissões do bot."
          ),
        ],
      });
    }
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
