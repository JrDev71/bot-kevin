// commands/pd.js

const { EmbedBuilder } = require("discord.js");
const {
  getPdData,
  addPd,
  removePd,
  MAX_PDS_PER_STAFF,
} = require("../pdManager");

const PD_ROLE_ID = "1435040530701746236"; // ID do Cargo de Primeira Dama
const PD_PERMITTED_ROLES = [
  "1435040516814147715",
  "1435040517665853571",
  "1435040518571819099",
  "1435040519918059521",
]; // IDs dos cargos que podem usar o setpd
const PREFIX = "k!"; // Prefixo

/**
 * Função principal que gerencia os comandos PD, setpd, e removepd.
 */
module.exports = {
  // Exporte esta função para ser chamada pelo messageCreate.js
  handlePDCommand: async (message, command, args) => {
    const pdData = getPdData();
    const client = message.client;

    // --- Comando: k!pd (Visualizar PDs Atuais) ---
    if (command === "pd") {
      if (pdData.pds.length === 0) {
        return message.channel.send(
          "Atualmente, não há nenhuma Primeira Dama definida."
        );
      }

      const pdEmbed = new EmbedBuilder()
        .setTitle(`👑 Primeiras Damas Atuais do Servidor`)
        .setColor(0xffa500);

      // Usa Promise.all para buscar membros de forma assíncrona e segura
      const pdPromises = pdData.pds.map(async (pd, index) => {
        const pdMember = await message.guild.members
          .fetch(pd.memberId)
          .catch(() => null);
        const staffUser = await client.users
          .fetch(pd.staffId)
          .catch(() => null);

        const staffTag = staffUser ? staffUser.tag : "Staff Desconhecido";
        const sinceDate = new Date(pd.since).toLocaleDateString("pt-BR");

        if (pdMember) {
          const pdName = pdMember.displayName;

          pdEmbed.addFields({
            name: `👸 #${index + 1}: ${pdName}`,
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
            name: `❌ PD Antiga (Membro saiu)`,
            value: `ID: ${pd.memberId} (Indicada por: ${staffTag})`,
            inline: true,
          });
        }
      });

      // Espera todas as buscas (fetch) terminarem antes de enviar
      await Promise.all(pdPromises);

      await message.channel.send({ embeds: [pdEmbed] });
      if (message.deletable) await message.delete().catch(console.error);
      return;
    }

    // --- Comando: k!setpd (@membro) ---
    if (command === "setpd") {
      // Checa se o Staff tem a permissão
      const isPermitted = message.member.roles.cache.some((role) =>
        PD_PERMITTED_ROLES.includes(role.id)
      );

      if (!isPermitted) {
        return message.reply(
          "❌ Você não tem permissão para definir a Primeira Dama."
        );
      }

      const newPdMember = message.mentions.members.first();
      if (!newPdMember) {
        return message.reply(`Uso correto: \`${PREFIX}setpd @membro\`.`);
      }

      const pdRoleId = PD_ROLE_ID;
      const pdRole = message.guild.roles.cache.get(pdRoleId);

      if (!pdRole) {
        console.error("Erro: Cargo PD_ROLE_ID não encontrado.");
        return message.reply(
          "❌ Erro interno: O cargo de Primeira Dama não está configurado corretamente."
        );
      }

      // Tenta adicionar a PD ao sistema
      const { success, message: managerMessage } = addPd(
        newPdMember.id,
        message.author.id
      );

      if (!success) {
        return message.reply(`❌ ${managerMessage}`);
      }

      try {
        // DÁ O CARGO À NOVA PD
        await newPdMember.roles.add(pdRole);

        // Notifica o canal
        await message.channel.send(
          `🎉 A Staff **${message.author.tag}** indicou <@${
            newPdMember.id
          }> como uma **Primeira Dama**! Ela recebeu o cargo ${pdRole.toString()}.`
        );

        // Notifica o Staff
        const remaining =
          MAX_PDS_PER_STAFF - (getPdData().staffCount[message.author.id] || 0);
        return message.reply(
          `✅ Você definiu ${newPdMember.user.tag} como PD. Você ainda pode indicar mais ${remaining} PDs.`
        );
      } catch (error) {
        console.error("Erro ao adicionar cargo de PD:", error);
        // Se falhar, reverte a contagem no manager para evitar problemas de limite.
        removePd(newPdMember.id);
        return message.reply(
          "❌ Erro ao dar o cargo. Verifique as permissões do bot."
        );
      }
    }

    // --- Comando: k!removepd (@membro) ---
    if (command === "removepd") {
      const isPermitted = message.member.roles.cache.some((role) =>
        PD_PERMITTED_ROLES.includes(role.id)
      );

      if (!isPermitted) {
        return message.reply(
          "❌ Você não tem permissão para remover a Primeira Dama."
        );
      }

      const targetMember = message.mentions.members.first();
      if (!targetMember) {
        return message.reply(`Uso correto: \`${PREFIX}removepd @membro\`.`);
      }

      const pdRoleId = PD_ROLE_ID;
      const pdRole = message.guild.roles.cache.get(pdRoleId);

      if (!targetMember.roles.cache.has(pdRoleId)) {
        return message.reply(
          `❌ O membro ${targetMember.user.tag} não possui o cargo de Primeira Dama.`
        );
      }

      const { success, pdToRemove } = removePd(targetMember.id);

      if (!success) {
        return message.reply(
          `❌ Este membro não está listado como uma Primeira Dama no sistema.`
        );
      }

      try {
        // REMOVE O CARGO
        await targetMember.roles.remove(pdRole);

        // Notifica o Staff
        const staffTag = pdToRemove.staffId
          ? (await client.users.fetch(pdToRemove.staffId).catch(() => null))
              ?.tag
          : "Staff Desconhecido";
        const logMessage = pdToRemove
          ? `(Indicada por: ${staffTag}, desde: ${new Date(
              pdToRemove.since
            ).toLocaleDateString("pt-BR")})`
          : "";

        await message.reply(
          `✅ ${targetMember.user.tag} foi removido(a) como Primeira Dama. ${logMessage}`
        );

        // Notifica o canal (opcional)
        await message.channel.send(
          `💔 A Staff **${message.author.tag}** removeu o status de Primeira Dama de <@${targetMember.id}>.`
        );
      } catch (error) {
        console.error("Erro ao remover cargo de PD:", error);
        return message.reply(
          "❌ Erro ao remover o cargo. Verifique as permissões do bot."
        );
      }
    }
  },
};
