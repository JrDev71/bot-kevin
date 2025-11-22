// commands/lockdown.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

module.exports = {
  handleLockdown: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return message.channel.send(
        "🔒 Apenas Administradores podem trancar o canal."
      );

    const channel = message.channel;

    try {
      // Tranca APENAS este canal
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false,
      });

      const embed = new EmbedBuilder()
        .setTitle("🔒 CANAL TRANCADO")
        .setDescription("Este canal foi pausado pela administração.")
        .setColor(0xff0000);

      message.channel.send({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      message.channel.send("❌ Erro ao tentar trancar este canal.");
    }
  },

  // --- NOVO: TRANCA TODOS OS CANAIS DE TEXTO ---
  handleLockdownAll: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return message.channel.send(
        "🔒 Apenas Admins podem iniciar Lockdown Global."
      );

    const channels = message.guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText
    );
    let count = 0;

    message.channel.send(
      `🚨 **INICIANDO LOCKDOWN GLOBAL...** Isso pode levar alguns segundos.`
    );

    for (const [id, channel] of channels) {
      try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: false,
        });
        count++;
      } catch (e) {
        console.log(`Não foi possível trancar ${channel.name}`);
      }
    }

    message.channel.send(`🔒 **SUCESSO:** ${count} canais foram trancados.`);
  },

  handleUnlockdown: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return;

    const channel = message.channel;

    try {
      // Destranca APENAS este canal
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
};
