// index.js

// Importações principais
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http"); // Health check do Render
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Partials,
} = require("discord.js");

// Importação do Gerenciador VIP
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
    GatewayIntentBits.GuildMessageReactions,
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

// --- CONFIGURAÇÕES GLOBAIS ---
client.config = {
  // Verificação
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
  APPROVER_ROLE_ID: process.env.APPROVER_ROLE_ID,
  SECONDARY_APPROVER_ROLE_ID: process.env.SECONDARY_APPROVER_ROLE_ID,

  // Canais de Fluxo
  APPROVAL_CHANNEL_ID: process.env.APPROVAL_CHANNEL_ID,
  APPROVED_LOG_CHANNEL_ID: process.env.APPROVED_LOG_CHANNEL_ID,
  VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID,

  // Reaction Roles (Legado/Backup)
  ROLE_REACTION_CHANNEL_ID: process.env.ROLE_REACTION_CHANNEL_ID,
  ROLE_REACTION_MESSAGE_ID: process.env.ROLE_REACTION_MESSAGE_ID,

  // Logs
  MEMBER_JOIN_LEAVE_LOG_ID: process.env.MEMBER_JOIN_LEAVE_LOG_ID,
  MESSAGE_EDIT_LOG_ID: process.env.MESSAGE_EDIT_LOG_ID,
  MESSAGE_DELETE_LOG_ID: process.env.MESSAGE_DELETE_LOG_ID,
  MOD_BAN_LOG_ID: process.env.MOD_BAN_LOG_ID,
  MOD_MUTE_LOG_ID: process.env.MOD_MUTE_LOG_ID,
  VOICE_LOG_ID: process.env.VOICE_LOG_ID,
  CHANNEL_UPDATE_LOG_ID: process.env.CHANNEL_UPDATE_LOG_ID,
  PD_LOG_CHANNEL_ID: process.env.PD_LOG_CHANNEL_ID,
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID,

  // Auto-Roles (Jogos)
  FREEFIRE_ROLE_ID: process.env.FREEFIRE_ROLE_ID,
  VALORANT_ROLE_ID: process.env.VALORANT_ROLE_ID,
  CS_ROLE_ID: process.env.CS_ROLE_ID,
  ROBLOX_ROLE_ID: process.env.ROBLOX_ROLE_ID,
  GTA_ROLE_ID: process.env.GTA_ROLE_ID,
  MINECRAFT_ROLE_ID: process.env.MINECRAFT_ROLE_ID,

  // Mapeamento Antigo (Se ainda usado)
  ROLE_MAPPING: {
    "1437889904406433974": "1437891203558277283",
    "1437889927613517975": "1437891278690975878",
  },
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
      }
    } catch (e) {
      console.error(`[LOGS] Erro em ${file}:`, e);
    }
  }
  console.log(`[LOGS] Módulos de auditoria carregados.`);
} else {
  console.warn("[LOGS] Pasta 'events/loggers' não encontrada.");
}

// --- FUNÇÃO: POSTAR PAINEL DE VERIFICAÇÃO (LÓGICA INTELIGENTE) ---
async function postVerificationPanel(client) {
  const VERIFY_BUTTON_ID = "start_verification";
  const channel = client.channels.cache.get(
    client.config.VERIFICATION_CHANNEL_ID
  );

  if (!channel)
    return console.error(
      "Canal de verificação não encontrado. Verifique o ID no .env."
    );

  // Configuração Visual (Atualizada para combinar com o resto do bot)
  const HEADER_IMAGE =
    "https://i.pinimg.com/736x/4d/68/8e/4d688edfeedd4bec17b856d2a2ad7241.jpg";
  const THUMBNAIL_URL =
    "https://i.pinimg.com/736x/4d/68/8e/4d688edfeedd4bec17b856d2a2ad7241.jpg";

  // 1. Busca histórico para evitar duplicatas
  try {
    const messages = await channel.messages.fetch({ limit: 50 });

    // Verifica se já existe uma mensagem MINHA com o botão de verificação
    const panelExists = messages.find(
      (m) =>
        m.author.id === client.user.id &&
        m.components.some((row) =>
          row.components.some((btn) => btn.customId === VERIFY_BUTTON_ID)
        )
    );

    if (panelExists) {
      console.log(
        `[VERIFICAÇÃO] Painel já existe (ID: ${panelExists.id}). Nenhuma ação necessária.`
      );
      return;
    }
  } catch (e) {
    console.error("Erro ao verificar mensagens antigas:", e);
  }

  // 2. Se não existe, cria o novo
  const embed = new EmbedBuilder()
    .setTitle("<:certo_froid:1443643346722754692> KEVIN - VERIFICAÇÃO")
    .setDescription(
      "SÓ MLK BOM, OS MENO MAIS QUENTE!!\n **FORA PANELEIROS**\n\nClique no botão abaixo para iniciar seu processo de acesso."
    )
    .setColor(0x2f3136)
    .setThumbnail(THUMBNAIL_URL)
    .setImage(HEADER_IMAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel("Verificar")
      .setStyle(ButtonStyle.Success)
      .setEmoji("<:mov_ok:1439456247794634845>")
  );

  await channel.send({ embeds: [embed], components: [row] });
  console.log("[VERIFICAÇÃO] Novo painel postado com sucesso.");
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

  // Inicia verificador de VIPs (Database)
  console.log("[SISTEMA VIP] Iniciando verificador de validade...");
  checkExpiredVips(client);
  setInterval(() => {
    checkExpiredVips(client);
  }, 3600 * 1000);
});

// --- SERVER HTTP (Para o Render) ---
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MC KEVIN Bot is Online!\n");
});
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Render health check na porta ${port}`));

// --- LOGIN ---
client.login(TOKEN);
