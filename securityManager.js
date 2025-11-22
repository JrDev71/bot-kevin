// securityManager.js
const {
  EmbedBuilder,
  AuditLogEvent,
  PermissionsBitField,
} = require("discord.js");

// --- CONFIGURAÇÃO DE LIMITES (Personalize conforme a rigidez desejada) ---
const LIMITS = {
  CHANNEL_DELETE: { max: 2, time: 10000 }, // Max 2 canais deletados em 10s
  CHANNEL_CREATE: { max: 3, time: 10000 }, // Max 3 canais criados em 10s (Raid de canais)
  ROLE_DELETE: { max: 2, time: 10000 }, // Max 2 cargos deletados em 10s
  BAN_ADD: { max: 3, time: 10000 }, // Max 3 bans em 10s (Mass Ban)
  KICK_MEMBER: { max: 3, time: 10000 }, // Max 3 kicks em 10s
};

// Armazenamento temporário em memória: Map<UserID, Map<ActionType, {count, timer}>>
const tracker = new Map();

// Lista de IDs que o Anti-Nuke NUNCA vai punir (Seu ID, ID de outros bots confiáveis)
const WHITELIST = [
  "578307859964624928",
  "697947696702554223",
  // O ID do próprio bot já é ignorado automaticamente
];

/**
 * Função principal de verificação de segurança
 */
async function checkSecurity(client, guild, actionType, auditType) {
  try {
    // 1. Busca quem fez a ação nos Audit Logs
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: auditType });
    const entry = auditLogs.entries.first();

    if (!entry) return;

    // Verifica se o log é recente (menos de 5s) para evitar falsos positivos de logs antigos
    if (Date.now() - entry.createdTimestamp > 5000) return;

    const executor = entry.executor;

    // 2. Ignora se for o próprio bot ou alguém da Whitelist
    if (executor.id === client.user.id || WHITELIST.includes(executor.id))
      return;

    // 3. Ignora o Dono do Servidor (O bot não pode puni-lo de qualquer forma)
    if (executor.id === guild.ownerId) return;

    // 4. Inicializa o rastreador para esse usuário se não existir
    if (!tracker.has(executor.id)) tracker.set(executor.id, new Map());
    const userTracker = tracker.get(executor.id);

    // 5. Inicializa o rastreador para esse tipo de ação
    if (!userTracker.has(actionType)) {
      userTracker.set(actionType, { count: 1, timer: null });

      // Reseta o contador após o tempo limite
      const timer = setTimeout(() => {
        userTracker.delete(actionType);
        if (userTracker.size === 0) tracker.delete(executor.id);
      }, LIMITS[actionType].time);

      userTracker.get(actionType).timer = timer;
    } else {
      // Incrementa o contador
      const track = userTracker.get(actionType);
      track.count++;
    }

    // 6. VERIFICA SE PASSOU DO LIMITE (AÇÃO DE NUKE DETECTADA!)
    if (userTracker.get(actionType).count > LIMITS[actionType].max) {
      await punishNuker(guild, executor, actionType);
    }
  } catch (error) {
    console.error(`[ANTI-NUKE] Erro ao verificar segurança:`, error);
  }
}

/**
 * Punição Automática: Remove cargos e Bane
 */
async function punishNuker(guild, user, reasonType) {
  try {
    const member = await guild.members.fetch(user.id).catch(() => null);

    console.log(`[ANTI-NUKE] DETECTADO ATAQUE DE ${user.tag} (${reasonType})`);

    // A. Tenta remover todos os cargos (Quarentena imediata)
    if (member) {
      const roles = member.roles.cache.filter(
        (r) => r.name !== "@everyone" && r.editable
      );
      await member.roles
        .remove(roles, `Anti-Nuke: Detectado ${reasonType}`)
        .catch(console.error);
    }

    // B. Bane o usuário
    await guild.members.ban(user.id, {
      reason: `[SISTEMA DE SEGURANÇA] Anti-Nuke Trigger: ${reasonType}`,
    });

    // C. Avisa no canal de logs de segurança (se houver, ou no geral)
    // Você pode criar um SECURITY_LOG_CHANNEL_ID no .env se quiser
    // Por enquanto, vamos tentar avisar no canal de logs geral
    // const logChannel = guild.channels.cache.get(guild.client.config.LOG_CHANNEL_ID);
    // if (logChannel) { ... envia embed ... }
  } catch (error) {
    console.error(`[ANTI-NUKE] Falha ao punir ${user.tag}:`, error);
  }
}

module.exports = { checkSecurity, LIMITS };
