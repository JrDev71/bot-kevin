// commands/lockdown.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

module.exports = {
  // --- TRANCA UM CANAL ---
  handleLockdown: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return message.channel.send(
        "🔒 Apenas Administradores podem trancar o canal."
      );

    const channel = message.channel;

    try {
      // Nega envio de mensagens para @everyone
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false,
      });

      const embed = new EmbedBuilder()
        .setTitle("🔒 CANAL TRANCADO")
        .setDescription("Este canal foi bloqueado pela administração.")
        .setColor(0xff0000);

      message.channel.send({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      message.channel.send("❌ Erro ao tentar trancar este canal.");
    }
  },

  // --- TRANCA TODOS OS CANAIS (GLOBAL) ---
  handleLockdownAll: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return message.channel.send(
        "🔒 Apenas Admins podem iniciar Lockdown Global."
      );

    // Filtra apenas canais de texto
    const channels = message.guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText
    );

    await message.channel.send(
      `🚨 **INICIANDO LOCKDOWN GLOBAL...** (${channels.size} canais detectados). Isso pode levar um momento.`
    );

    let count = 0;
    // Loop seguro para evitar Rate Limit
    for (const [id, channel] of channels) {
      try {
        // Atualiza a permissão
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: false,
        });
        count++;
      } catch (e) {
        console.log(`Falha ao trancar ${channel.name}: ${e.message}`);
      }
    }

    message.channel.send(`🔒 **SUCESSO:** ${count} canais foram trancados.`);
  },

  // --- DESTRANCA UM CANAL ---
  handleUnlockdown: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return;

    const channel = message.channel;

    try {
      // Define como null para voltar ao padrão (herdado da categoria) ou true para forçar
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: null,
      });

      const embed = new EmbedBuilder()
        .setTitle("🔓 CANAL DESTRANCADO")
        .setDescription("Chat liberado.")
        .setColor(0x00ff00);

      message.channel.send({ embeds: [embed] });
    } catch (e) {
      message.channel.send("❌ Erro ao destrancar.");
    }
  },

  // --- DESTRANCA TODOS OS CANAIS (GLOBAL) ---
  handleUnlockdownAll: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return;

    const channels = message.guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText
    );

    await message.channel.send(
      `🔓 **INICIANDO DESBLOQUEIO GLOBAL...** (${channels.size} canais).`
    );

    let count = 0;
    for (const [id, channel] of channels) {
      try {
        // Reseta a permissão para o padrão (null remove o bloqueio específico)
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: null,
        });
        count++;
      } catch (e) {
        console.log(`Falha ao destrancar ${channel.name}`);
      }
    }

    message.channel.send(`✅ **SUCESSO:** ${count} canais foram liberados.`);
  },
};
