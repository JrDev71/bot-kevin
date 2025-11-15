// index.js

// Importações principais
require("dotenv").config();
const fs = require("fs");
const path = require("path");
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
  ROLE_REACTION_MESSAGE_ID: process.env.ROLE_REACTION_MESSAGE_ID,

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

// --- EVENTO READY ---
client.once("ready", async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}!`);
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
  // Adicionei o log de teste aqui para tentar capturar qualquer evento de reação
  console.log("LOG: EVENTO DE REAÇÃO TENTANDO SER PROCESSADO!");

  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();

  const config = reaction.client.config;
  const emojiKey = reaction.emoji.id || reaction.emoji.name;

  // --- LOGS CRÍTICOS ---
  console.log("\n--- DEBUG ROLE REACTION ADD ---");
  console.log(`1. Msg ID Reagida: ${reaction.message.id}`);
  console.log(`2. Config ID Esperado: ${config.ROLE_REACTION_MESSAGE_ID}`);
  console.log(`3. Emoji Key (Busca): ${emojiKey}`);

  if (reaction.message.id !== config.ROLE_REACTION_MESSAGE_ID) {
    console.log("-> FALHA 1: IDs da mensagem não coincidem. Reação ignorada.");
    console.log("-------------------------\n");
    return;
  }

  const roleId = config.ROLE_MAPPING[emojiKey];
  console.log(`4. Role ID Mapeado: ${roleId || "NÃO ENCONTRADO"}`);

  if (!roleId) {
    console.log("-> FALHA 2: Emoji não mapeado (ID do cargo não encontrado).");
    console.log("-------------------------\n");
    return;
  }
  // --- FIM DOS LOGS DE CHECAGEM ---

  const member = reaction.message.guild.members.cache.get(user.id);
  const role = reaction.message.guild.roles.cache.get(roleId);

  if (member && role) {
    try {
      await member.roles.add(role);
      console.log(`✅ SUCESSO! Cargo ${role.name} adicionado a ${user.tag}`);
    } catch (err) {
      console.error(
        "❌ ERRO FINAL: Falha ao adicionar cargo (Permissões?):",
        err.message
      );
    }
  }
});

// --- HANDLERS DE REAÇÃO DE REMOÇÃO ---
client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();

  const config = reaction.client.config;
  const emojiKey = reaction.emoji.id || reaction.emoji.name;

  // --- LOGS CRÍTICOS ---
  console.log("\n--- DEBUG ROLE REACTION REMOVE ---");
  console.log(`1. Msg ID Reagida: ${reaction.message.id}`);
  console.log(`2. Config ID Esperado: ${config.ROLE_REACTION_MESSAGE_ID}`);
  console.log(`3. Emoji Key (Busca): ${emojiKey}`);

  if (reaction.message.id !== config.ROLE_REACTION_MESSAGE_ID) {
    console.log("-> FALHA 1: IDs da mensagem não coincidem. Remoção ignorada.");
    console.log("-------------------------\n");
    return;
  }

  const roleId = config.ROLE_MAPPING[emojiKey];
  console.log(`4. Role ID Mapeado: ${roleId || "NÃO ENCONTRADO"}`);

  if (!roleId) {
    console.log("-> FALHA 2: Emoji não mapeado (ID do cargo não encontrado).");
    console.log("-------------------------\n");
    return;
  }

  const member = reaction.message.guild.members.cache.get(user.id);
  const role = reaction.message.guild.roles.cache.get(roleId); // Checa se o membro tem o cargo antes de tentar remover (segurança)

  if (member && role && member.roles.cache.has(roleId)) {
    try {
      await member.roles.remove(role);
      console.log(`🗑️ SUCESSO! Cargo ${role.name} removido de ${user.tag}`);
    } catch (err) {
      console.error(
        "❌ ERRO FINAL: Falha ao remover cargo (Permissões?):",
        err.message
      );
    }
  } else {
    console.log(
      `INFO: Membro não tinha o cargo, ou cargo/membro não encontrado.`
    );
  }
  console.log("-------------------------\n");
});

// --- LOGIN ---
client.login(TOKEN);
