// events/messageCreate.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// --- IMPORTAÇÕES DOS SISTEMAS ---
const { getGameState } = require("../game/gameState");
const { startRound } = require("../game/gameManager");
const { postReviewEmbed } = require("../game/scoreSystem");
const { handlePDCommand } = require("../pdManager");

// --- HANDLERS DE SEGURANÇA ---
const handleMention = require("../handlers/mentionHandler");
const handleAntiSpam = require("../handlers/antiSpamHandler");
const handleChatProtection = require("../handlers/chatProtectionHandler");

// --- COMANDOS (MODULARIZADOS) ---
const { handleAvatar } = require("../commands/avatar");
const { handleRepeat } = require("../commands/repeat");
const { handleVipCommands } = require("../commands/vip");
const { handleProtection } = require("../commands/protection");
const { handleBan, handleUnban, handleKick } = require("../commands/modBasic");
const { handleNuke } = require("../commands/nuke");
const {
  handleMute,
  handleUnmute,
  handleJail,
  handleUnjail,
} = require("../commands/timeMod");
const { handleHelp } = require("../commands/help");
const {
  handleLockdown,
  handleUnlockdown,
  handleLockdownAll,
  handleUnlockdownAll,
} = require("../commands/lockdown");
const { handleBotInfo } = require("../commands/botinfo");
const { handleListMembers } = require("../commands/listMembers");

// --- PAINÉIS DE GESTÃO ---
const { sendRolePanel } = require("../commands/rolePanel");
const { handleChannelPanel } = require("../commands/channelPanel");
const { handleModPanel } = require("../commands/modPanel");

const PREFIX = "k!";

// Configuração Visual
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_NEUTRAL = 0x2f3136;

// Helper Visual
const createFeedbackEmbed = (title, description) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(COLOR_NEUTRAL)
    .setTimestamp();
};

module.exports = async (message) => {
  if (message.author.bot) return;

  // 1. SEGURANÇA
  if (await handleChatProtection(message)) return;
  if (await handleAntiSpam(message)) return;

  // 2. JOGO STOP (RESPOSTA RÁPIDA) E MENÇÃO
  const state = getGameState(message.guild.id);
  const userId = message.author.id;

  if (await handleMention(message)) return;

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
                    "<:Nao:1443642030637977743> Resposta Inválida",
                    `Todas as respostas devem começar com a letra **${currentLetter}**!`
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
          await message.react("<:certo_froid:1443643346722754692>");
          if (message.deletable)
            try {
              await message.delete();
            } catch (e) {}
          return;
        }
      }
    }
    return;
  }

  // 3. EXCLUSÃO DE COMANDO
  if (message.deletable) {
    try {
      await message.delete();
    } catch (error) {
      if (error.code !== 10008) console.error("Erro delete:", error);
    }
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  // ==========================
  // ROTEAMENTO DE COMANDOS
  // ==========================

  // --- PAINÉIS GERAIS DE ADMINISTRAÇÃO ---
  if (["cargo", "cargosadmin"].includes(command)) return sendRolePanel(message); // Painel de criar/deletar cargos
  if (["canal", "canais", "infra"].includes(command))
    return handleChannelPanel(message);
  if (["mod", "punir", "justice"].includes(command))
    return handleModPanel(message);

  // --- SISTEMAS ---
  if (["help", "ajuda", "comandos"].includes(command))
    return handleHelp(message);
  if (["sistemas", "botinfo"].includes(command)) return handleBotInfo(message);
  if (
    [
      "vip",
      "vipadm",
      "setvip",
      "addvip",
      "remvip",
      "addtime",
      "renovar",
    ].includes(command)
  )
    return handleVipCommands(message, command, args);
  if (["panela", "blacklist"].includes(command))
    return handleProtection(message, command, args);
  if (["pd", "setpd", "removepd"].includes(command))
    return handlePDCommand(message, command, args);

  // --- MODERAÇÃO MANUAL ---
  if (command === "ban") return handleBan(message, args);
  if (command === "unban") return handleUnban(message, args);
  if (command === "kick") return handleKick(message, args);
  if (command === "nuke") return handleNuke(message);
  if (command === "mute") return handleMute(message, args);
  if (command === "unmute") return handleUnmute(message, args);
  if (command === "prender") return handleJail(message, args);
  if (command === "soltar") return handleUnjail(message, args);
  if (["lock", "trancar"].includes(command)) return handleLockdown(message);
  if (["lockall", "trancartudo"].includes(command))
    return handleLockdownAll(message);
  if (["unlock", "destrancar"].includes(command))
    return handleUnlockdown(message);
  if (["unlockall", "destrancartudo"].includes(command))
    return handleUnlockdownAll(message);

  // --- UTIL ---
  if (command === "av") return handleAvatar(message, args);
  if (command === "repeat") return handleRepeat(message, args);
  if (["membros", "listmembers", "list"].includes(command))
    return handleListMembers(message, args); // --- PAINEL DE CARGOS (AUTO-ROLE / JOGOS) - ATUALIZADO ---

  if (command === "roles" || command === "cargos") {
    // 'cargos' agora aponta para o auto-role, use 'cargosadmin' para gestão
    if (!message.member.permissions.has("MANAGE_GUILD")) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "<:cadeado:1443642375833518194> Sem Permissão",
            `Requer **Gerenciar Servidor**.`
          ),
        ],
      });
    }

    const rolePanelEmbed = new EmbedBuilder()
      .setTitle("<:controle:1443678488870785044> Selecione seus Jogos")
      .setDescription(
        "Clique nos botões abaixo para adicionar ou remover as tags de jogo no seu perfil.\n" +
          "Isso liberará canais e notificações específicas para cada game."
      )
      .setColor(COLOR_NEUTRAL)
      .setImage(HEADER_IMAGE)
      .setTimestamp();

    // Linha 1: FPS / Tiro
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_role_ff")
        .setLabel("Free Fire")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:freefire:1443689056197283982>"),
      new ButtonBuilder()
        .setCustomId("btn_role_val")
        .setLabel("Valorant")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:valorant:1439457595290292344>"),
      new ButtonBuilder()
        .setCustomId("btn_role_cs")
        .setLabel("CS:GO/2")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:cs2:1443689897998422087>")
    );

    // Linha 2: Outros
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_role_gta")
        .setLabel("GTA V")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:fiveM:1443690654612848690>"),
      new ButtonBuilder()
        .setCustomId("btn_role_roblox")
        .setLabel("Roblox")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:roblox:1443691205929078876>"),
      new ButtonBuilder()
        .setCustomId("btn_role_mine")
        .setLabel("Minecraft")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:minecraft:1443692753958600898>")
    );

    try {
      const sentMessage = await message.channel.send({
        embeds: [rolePanelEmbed],
        components: [row1, row2],
      });
      // Não precisamos mais de reações aqui
    } catch (error) {
      console.error("Erro Roles:", error);
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "<:Nao:1443642030637977743> Erro",
            "Falha ao postar painel."
          ),
        ],
      });
    }
  } // --- JOGO STOP ---

  if (command === "stop") {
    if (state.isActive)
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "🛑 Jogo Ativo",
            `Já existe um jogo ativo (Letra **${state.currentLetter}**).`
          ),
        ],
      });
    await startRound(message, state, true);
    return;
  }
  if (command === "parar") {
    if (!state.isActive)
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            "<:Nao:1443642030637977743> Jogo Inativo",
            `Não há jogo ativo.`
          ),
        ],
      });
    clearTimeout(state.timer);
    state.isActive = false;
    await message.channel.send({
      embeds: [
        createFeedbackEmbed(
          "<:certo_froid:1443643346722754692> STOP!",
          "Rodada encerrada manualmente."
        ),
      ],
    });
    await postReviewEmbed(state, message.channel);
  } // --- RESPOSTA OBSOLETA ---

  if (command === "resposta" || command === "respostas") {
    return message.channel
      .send({
        embeds: [
          createFeedbackEmbed(
            "Obsoleto",
            `Envie suas respostas direto no chat.`
          ),
        ],
      })
      .then((m) => setTimeout(() => m.delete(), 5000));
  }
};
