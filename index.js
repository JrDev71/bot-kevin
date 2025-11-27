// index.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http"); // Workaround para Render
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Partials,
} = require("discord.js");

// Importação do Gerenciador VIP (para checagem automática)
const { checkExpiredVips } = require("./vipManager");

const TOKEN = process.env.DISCORD_TOKEN;

// Inicialização do Cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions, // Mantido caso queira usar reações em outros sistemas
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

// --- CONFIGURAÇÕES GLOBAIS (client.config) ---
client.config = {
  // --- IDs Básicos ---
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
  APPROVER_ROLE_ID: process.env.APPROVER_ROLE_ID,
  SECONDARY_APPROVER_ROLE_ID: process.env.SECONDARY_APPROVER_ROLE_ID,

  // --- Canais ---
  APPROVAL_CHANNEL_ID: process.env.APPROVAL_CHANNEL_ID,
  APPROVED_LOG_CHANNEL_ID: process.env.APPROVED_LOG_CHANNEL_ID,
  VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID,

  // --- Logs de Auditoria ---
  MEMBER_JOIN_LEAVE_LOG_ID: process.env.MEMBER_JOIN_LEAVE_LOG_ID,
  MESSAGE_EDIT_LOG_ID: process.env.MESSAGE_EDIT_LOG_ID,
  MESSAGE_DELETE_LOG_ID: process.env.MESSAGE_DELETE_LOG_ID,
  MOD_BAN_LOG_ID: process.env.MOD_BAN_LOG_ID,
  MOD_MUTE_LOG_ID: process.env.MOD_MUTE_LOG_ID,
  VOICE_LOG_ID: process.env.VOICE_LOG_ID,
  CHANNEL_UPDATE_LOG_ID: process.env.CHANNEL_UPDATE_LOG_ID,
  PD_LOG_CHANNEL_ID: process.env.PD_LOG_CHANNEL_ID,
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID,

  // --- IDs de Jogos (Auto-Role via Botão) ---
  FREEFIRE_ROLE_ID: process.env.FREEFIRE_ROLE_ID,
  VALORANT_ROLE_ID: process.env.VALORANT_ROLE_ID,
  CS_ROLE_ID: process.env.CS_ROLE_ID,
  ROBLOX_ROLE_ID: process.env.ROBLOX_ROLE_ID,
  GTA_ROLE_ID: process.env.GTA_ROLE_ID,
  MINECRAFT_ROLE_ID: process.env.MINECRAFT_ROLE_ID,
};

// --- CARREGAMENTO DE EVENTOS ---
const handleMessageCreate = require("./events/messageCreate");
client.on("messageCreate", handleMessageCreate);

const handleInteractionCreate = require("./events/interactionCreate");
client.on("interactionCreate", handleInteractionCreate);

// --- CARREGAMENTO DE LOGGERS (AUDITORIA) ---
const loggersPath = path.join(__dirname, "events", "loggers");
if (fs.existsSync(loggersPath)) {
  const loggerFiles = fs
    .readdirSync(loggersPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of loggerFiles) {
    try {
      const logger = require(path.join(loggersPath, file));
      if (logger.name && logger.execute) {
        client.on(logger.name, (...args) => logger.execute(client, ...args));
        console.log(`[LOGS] Carregado: ${file}`);
      }
    } catch (e) {
      console.error(`[LOGS] Erro em ${file}:`, e);
    }
  }
}

// --- FUNÇÃO: POSTAR PAINEL DE VERIFICAÇÃO (NO INÍCIO) ---
async function postVerificationPanel(client) {
  const VERIFY_BUTTON_ID = "start_verification";
  const channel = client.channels.cache.get(
    client.config.VERIFICATION_CHANNEL_ID
  );

  if (!channel)
    return console.error(
      "Canal de verificação não encontrado. Verifique o ID no .env."
    );

  // Configuração Visual
  const HEADER_IMAGE =
    "https://i.pinimg.com/736x/32/5c/a9/325ca9de6228659f8f9ec5d14bc8fbb5.jpg";
  const THUMBNAIL_URL =
    "https://i.pinimg.com/736x/32/5c/a9/325ca9de6228659f8f9ec5d14bc8fbb5.jpg";

  const embed = new EmbedBuilder()
    .setTitle("✅ Verificação de Membro")
    .setDescription("SÓ MLK BOM, OS MENO MAIS QUENTE!! FORA PANELEIROS.")
    .setColor(0x2f3136)
    .setThumbnail(THUMBNAIL_URL)
    .setImage(HEADER_IMAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel("VERIFICAR")
      .setStyle(ButtonStyle.Success)
      .setEmoji("<:mov_ok:1439456247794634845>")
  );

  const messages = await channel.messages.fetch({ limit: 5 });
  if (
    !messages.some((m) =>
      m.embeds.some(
        (e) =>
          e.title === "<:certo_froid:1443643346722754692> Verificação de Membro"
      )
    )
  ) {
    await channel.send({ embeds: [embed], components: [row] });
    console.log("Painel de verificação postado.");
  }
}

// --- HANDLERS DE ESTABILIDADE ---
process.on("uncaughtException", (err) =>
  console.error(`[CRÍTICO] Uncaught Exception:`, err)
);
process.on("unhandledRejection", (reason) =>
  console.error(`[CRÍTICO] Unhandled Rejection:`, reason)
);

// --- EVENTO READY ---
client.once("ready", async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}!`);
  console.log(`[STATUS] Bot pronto para receber comandos.`);

  await postVerificationPanel(client);

  // Inicia verificador de VIPs expirados (Database)
  console.log("[SISTEMA VIP] Iniciando verificador de validade...");
  checkExpiredVips(client);

  // Roda a cada 1 hora
  setInterval(() => {
    checkExpiredVips(client);
  }, 3600 * 1000);
});

// --- SERVER HTTP (Para o Render não desligar o bot) ---
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MC KEVIN Bot is Online!\n");
});
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Render health check na porta ${port}`));

// --- LOGIN ---
client.login(TOKEN);
