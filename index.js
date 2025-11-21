// index.js

// Importações principais
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http"); // Adicionado para o health check do Render
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Collection,
} = require("discord.js");

// Carregar Variáveis de Ambiente e Constantes
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Inicialização do Cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions, // NECESSÁRIO
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"], // NECESSÁRIO
});

// --- VARIÁVEIS DE MAPEAMENTO GLOBAL ---
client.config = {
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
  APPROVER_ROLE_ID: process.env.APPROVER_ROLE_ID,
  SECONDARY_APPROVER_ROLE_ID: process.env.SECONDARY_APPROVER_ROLE_ID,

  APPROVAL_CHANNEL_ID: process.env.APPROVAL_CHANNEL_ID,
  APPROVED_LOG_CHANNEL_ID: process.env.APPROVED_LOG_CHANNEL_ID,
  VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID,
  ROLE_REACTION_CHANNEL_ID: process.env.ROLE_REACTION_CHANNEL_ID,
  ROLE_REACTION_MESSAGE_ID: process.env.ROLE_REACTION_MESSAGE_ID, // NOVOS CANAIS DE LOG DEDICADOS

  MEMBER_JOIN_LEAVE_LOG_ID: process.env.MEMBER_JOIN_LEAVE_LOG_ID,
  MESSAGE_EDIT_LOG_ID: process.env.MESSAGE_EDIT_LOG_ID,
  MESSAGE_DELETE_LOG_ID: process.env.MESSAGE_DELETE_LOG_ID,
  MOD_BAN_LOG_ID: process.env.MOD_BAN_LOG_ID,
  MOD_MUTE_LOG_ID: process.env.MOD_MUTE_LOG_ID,
  VOICE_LOG_ID: process.env.VOICE_LOG_ID,
  CHANNEL_UPDATE_LOG_ID: process.env.CHANNEL_UPDATE_LOG_ID,

  ROLE_MAPPING: {
    "1437889904406433974": "1437891203558277283",
    "1437889927613517975": "1437891278690975878",
  },
};

// --- CARREGAMENTO DE EVENTOS ---

const { startRound } = require("./game/gameManager");

const handleMessageCreate = require("./events/messageCreate");
client.on("messageCreate", handleMessageCreate);

const handleInteractionCreate = require("./events/interactionCreate");
client.on("interactionCreate", handleInteractionCreate);

// --- POSTAGEM DO PAINEL DE VERIFICAÇÃO ---
async function postVerificationPanel(client) {
  const VERIFY_BUTTON_ID = "start_verification";
  const channel = client.channels.cache.get(
    client.config.VERIFICATION_CHANNEL_ID
  );

  if (!channel) {
    return console.error(
      "Canal de verificação não encontrado. Verifique o ID no .env."
    );
  }

  const LOGO_URL =
    "https://media.discordapp.net/attachments/1435040616831782922/1435059494228066445/3238061aac6396f0246f33fe01cb283c.jpg?width=450&height=442";

  const embed = new EmbedBuilder()
    .setTitle("✅ Verificação de Membro")
    .setDescription("SÓ MLK BOM, OS MENO MAIS QUENTE!! FORA PANELEIROS")
    .setColor(0x00ff00)
    .setImage(LOGO_URL);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel("Verificar")
      .setStyle(ButtonStyle.Primary)
  );

  const messages = await channel.messages.fetch({ limit: 5 });
  if (
    !messages.some((m) =>
      m.embeds.some((e) => e.title === "✅ Verificação de Membro")
    )
  ) {
    await channel.send({ embeds: [embed], components: [row] });
    console.log("Painel de verificação postado.");
  }
}

// --- HANDLERS DE ESTABILIDADE CRÍTICA ---
process.on("uncaughtException", (err, origin) => {
  console.error(`\n--- Erro Crítico (Uncaught Exception) ---`);
  console.error(`Causa: ${origin}\nErro:`, err);
  console.error(`------------------------------------------\n`);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(`\n--- Promessa Rejeitada (Unhandled Rejection) ---`);
  console.error(`Razão:`, reason);
  console.error(`Promise:`, promise);
  console.error(`-------------------------------------------------\n`);
});

// --- EVENTO READY ---
client.once("ready", async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}!`);
  console.log(`[STATUS] Bot pronto para receber comandos.`);
  await postVerificationPanel(client); // Força o fetch da mensagem de role reaction (Sincronização de ID)

  const { ROLE_REACTION_MESSAGE_ID, ROLE_REACTION_CHANNEL_ID } = client.config;
  if (ROLE_REACTION_MESSAGE_ID && ROLE_REACTION_CHANNEL_ID) {
    const channel = client.channels.cache.get(ROLE_REACTION_CHANNEL_ID);
    if (channel?.isTextBased()) {
      try {
        await channel.messages.fetch(ROLE_REACTION_MESSAGE_ID); // LOG DE SUCESSO
        console.log(
          `[SUCESSO] Mensagem de Role Reaction carregada na memória. ID: ${ROLE_REACTION_MESSAGE_ID}`
        );
      } catch (err) {
        // LOG DE ERRO
        console.error(
          `[ERRO] Falha ao carregar mensagem de Role Reaction (ID: ${ROLE_REACTION_MESSAGE_ID}). Verifique se a mensagem foi deletada.`,
          err
        );
      }
    } else {
      console.error(
        `[ERRO] Canal de Role Reaction (ID: ${ROLE_REACTION_CHANNEL_ID}) não encontrado ou não é de texto.`
      );
    }
  }
});

// --- HANDLERS DE REAÇÃO DE ADIÇÃO (OK) ---
client.on("messageReactionAdd", async (reaction, user) => {
  // ... (lógica de reação) ...
});

// --- HANDLERS DE REAÇÃO DE REMOÇÃO ---
client.on("messageReactionRemove", async (reaction, user) => {
  // ... (lógica de remoção de reação) ...
});

// --- WORKAROUND PARA RENDER (HEALTH CHECK) ---
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MC KEVIN Bot is running and healthy!\n");
});

// A porta é definida pelo Render (process.env.PORT)
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Render health check server running on port ${port}`);
});

// --- LOGIN ---
client.login(TOKEN);
