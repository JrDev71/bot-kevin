// events/messageCreate.js
const { EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

// IMPORTAÇÕES DOS MÓDULOS
const { getGameState } = require("../game/gameState");
const { calculateScores, postReviewEmbed } = require("../game/scoreSystem");
const { startRound } = require("../game/gameManager");
const { handlePDCommand } = require("../pdManager");

const handleMention = require("../handlers/mentionHandler");
const avatarCommand = require("../commands/avatar");
const { handleClear } = require("../commands/roncaputa");
const PREFIX = "k!";

// Emojis Customizados do Usuário (IDs)
const EMOJIS = {
  FREEFIRE_ID: "1437889904406433974",
  VALORANT_ID: "1437889927613517975",
};

/**
 * Função auxiliar para criar embeds de feedback (erros/uso).
 */
const createFeedbackEmbed = (title, description, color = 0xff0000) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
};

// --- INÍCIO DO MÓDULO ---
module.exports = async (message) => {
  try {
    // Ignora mensagens de bots
    if (message.author.bot) return;

    // Obtém o estado do jogo para o servidor atual
    const state = getGameState(message.guild.id);
    const userId = message.author.id;

    // --- 1. RESPOSTA A MENÇÃO (@Bot) ---
    if (await handleMention(message)) return;

    // --- LÓGICA DE COMANDO DE PREFIXO (k!) ---
    // Checa se a mensagem é uma resposta rápida do Stop
    if (!message.content.startsWith(PREFIX)) {
      if (state.isActive) {
        const currentLetter = state.currentLetter;

        if (state.players[userId] && state.players[userId].isStopped) return;

        const content = message.content.trim().toUpperCase();

        if (content.startsWith(currentLetter) && content.includes(",")) {
          const rawAnswers = content.split(",");
          const cleanedAnswers = rawAnswers
            .map((ans) => ans.trim().toUpperCase())
            .filter((ans) => ans.length > 0);

          const categoriesCount = state.categories.length;

          if (cleanedAnswers.length === categoriesCount) {
            const hasInvalidLetter = cleanedAnswers.some(
              (ans) => !ans.startsWith(currentLetter)
            );

            if (hasInvalidLetter) {
              return message.channel
                .send({
                  embeds: [
                    createFeedbackEmbed(
                      "❌ Resposta Inválida",
                      `Todas as respostas devem começar com a letra **${currentLetter}**!`,
                      0x00bfff
                    ),
                  ],
                })
                .then((m) => setTimeout(() => m.delete(), 5000));
            }

            state.players[userId] = {
              answers: cleanedAnswers,
              isStopped: true,
              score: 0,
            };

            await message.react("✅");
            if (message.deletable) message.delete().catch(console.error);
            return;
          }
        }
      }
      return;
    }

    // --- EXCLUSÃO CENTRALIZADA ---
    if (message.deletable) {
      message.delete().catch(console.error);
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- ROTEAMENTO 1: COMANDOS PD ---
    if (["pd", "setpd", "removepd"].includes(command)) {
      return handlePDCommand(message, command, args);
    }

    // --- ROTEAMENTO 2: AVATAR ---
    if (command === "av" || command === "avatar") {
      if (typeof avatarCommand.execute === "function") {
        return avatarCommand.execute(message.client, message, args);
      } else {
        console.error("❌ O comando de avatar não possui função execute().");
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "⚠️ Erro Interno",
              "O comando de avatar está configurado incorretamente.",
              0xffa500
            ),
          ],
        });
      }
    }

    // --- ROTEAMENTO 3: k!repeat ---
    if (command === "repeat") {
      const textToRepeat = args.join(" ");
      if (!textToRepeat) {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "❓ Uso Incorreto",
              `Você precisa me dizer o que repetir! Use o formato \`${PREFIX}repeat <seu texto>\`.`
            ),
          ],
        });
      }
      return await message.channel.send(textToRepeat);
    }

    // --- ROTEAMENTO 4: k!icons ---
    if (command === "icons") {
      await message.channel.send("Buscando ícones aleatórios... 🐾");

      try {
        const icons = [];
        const numberOfIcons = 5;

        for (let i = 0; i < numberOfIcons; i++) {
          const response = await fetch(
            "https://dog.ceo/api/breeds/image/random"
          );
          const data = await response.json();

          if (data.status === "success") icons.push(data.message);
        }

        if (icons.length === 0) {
          return message.channel.send({
            embeds: [
              createFeedbackEmbed(
                "❌ Erro de Busca",
                "Desculpe, não consegui encontrar ícones agora. Tente novamente."
              ),
            ],
          });
        }

        const iconsEmbed = new EmbedBuilder()
          .setTitle("🐶 Opções de Ícones Aleatórios")
          .setDescription(`Encontrei ${icons.length} opções para você!`)
          .setColor(0xffa500);

        icons.forEach((url, i) =>
          iconsEmbed.addFields({
            name: `Opção #${i + 1}:`,
            value: `[Link Direto para o Ícone](${url})`,
            inline: true,
          })
        );

        if (icons[0]) iconsEmbed.setThumbnail(icons[0]);

        return message.channel.send({ embeds: [iconsEmbed] });
      } catch (error) {
        console.error("Erro ao buscar ícones aleatórios:", error);
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "🔥 Erro Crítico",
              "Houve um erro ao buscar os ícones (Falha de API)."
            ),
          ],
        });
      }
    }

    // --- ROTEAMENTO 5: k!roles ---
    if (["roles", "cargos"].includes(command)) {
      if (!message.member.permissions.has("ManageGuild")) {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "🔒 Sem Permissão",
              "Você não tem permissão para postar o painel de cargos. Requer **Gerenciar Servidor**."
            ),
          ],
        });
      }

      const freefireEmoji = message.guild.emojis.cache.get(EMOJIS.FREEFIRE_ID);
      const valorantEmoji = message.guild.emojis.cache.get(EMOJIS.VALORANT_ID);

      const rolePanelEmbed = new EmbedBuilder()
        .setTitle("🎮 Escolha seu Jogo")
        .setDescription(
          "Reaja de acordo com seu jogo:\n\n" +
            `${freefireEmoji || "🔥"} — Cargo de Free Fire\n` +
            `${valorantEmoji || "🎯"} — Cargo de Valorant\n\n` +
            "*Você pode remover o cargo tirando a reação.*"
        )
        .setColor(0x9b59b6)
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .setTimestamp();

      try {
        const sentMessage = await message.channel.send({
          embeds: [rolePanelEmbed],
        });
        await sentMessage.react(EMOJIS.FREEFIRE_ID);
        await sentMessage.react(EMOJIS.VALORANT_ID);

        return message.author
          .send({
            embeds: [
              createFeedbackEmbed(
                "✅ Painel Postado com Sucesso!",
                `**ID da Mensagem:** \`${sentMessage.id}\`\nAtualize \`ROLE_REACTION_MESSAGE_ID\` no seu \`.env\` e reinicie o bot.`,
                0x00ff00
              ),
            ],
          })
          .catch(() => {
            message.channel.send({
              embeds: [
                createFeedbackEmbed(
                  "✅ Painel Postado",
                  "O painel foi postado com sucesso! (Verifique sua DM para instruções)",
                  0x00ff00
                ),
              ],
            });
          });
      } catch (error) {
        console.error("Erro ao postar o painel de cargos:", error);
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "❌ Erro Crítico",
              "Falha ao postar o painel. Verifique permissões de embeds e reações."
            ),
          ],
        });
      }
    }

    // --- ROTEAMENTO 6: STOP GAME ---
    if (command === "stop") {
      if (state.isActive) {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "🛑 Jogo Ativo",
              `Já existe um jogo de Stop ativo! A letra é **${state.currentLetter}**. Digite \`${PREFIX}parar\` para encerrar.`
            ),
          ],
        });
      }
      await startRound(message, state, true);
      return;
    }

    if (command === "parar") {
      if (!state.isActive) {
        return message.channel.send({
          embeds: [
            createFeedbackEmbed(
              "❌ Jogo Inativo",
              `Não há nenhum jogo ativo. Use \`${PREFIX}stop\` para começar.`
            ),
          ],
        });
      }
      clearTimeout(state.timer);
      state.isActive = false;
      await message.channel.send(
        `✅ **STOP!** A rodada da letra **${state.currentLetter}** foi encerrada. Iniciando fase de revisão...`
      );
      await postReviewEmbed(state, message.channel);
    }

    // --- ROTEAMENTO 7: RESPOSTA OBSOLETA ---
    if (["resposta", "respostas"].includes(command)) {
      return message.channel
        .send({
          embeds: [
            createFeedbackEmbed(
              "Obsoleto",
              `Não use \`${PREFIX}resposta\`! Apenas envie suas respostas separadas por vírgula quando o jogo estiver ativo.`
            ),
          ],
        })
        .then((m) => setTimeout(() => m.delete(), 5000));
    }
  } catch (err) {
    console.error("❌ Erro em messageCreate:", err);
    return message.channel.send({
      embeds: [
        createFeedbackEmbed(
          "💥 Erro Interno",
          "Ocorreu um erro ao processar sua mensagem. O log foi registrado no console."
        ),
      ],
    });
  }
};
