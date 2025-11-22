// commands/lockdown.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

module.exports = {
  // Trancar Um
  handleLockdown: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return;
    try {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: false }
      );
      message.channel.send({
        embeds: [new EmbedBuilder().setTitle("🔒 TRANCADO").setColor(0xff0000)],
      });
    } catch (e) {
      message.channel.send("Erro.");
    }
  },

  // Trancar Todos
  handleLockdownAll: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return;
    const channels = message.guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText
    );
    message.channel.send(`🚨 Iniciando Lockdown Global...`);

    channels.forEach((channel) => {
      channel.permissionOverwrites
        .edit(message.guild.roles.everyone, { SendMessages: false })
        .catch(() => {});
    });
    message.channel.send(`🔒 Todos os canais de texto foram trancados.`);
  },

  // Destrancar Um
  handleUnlockdown: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return;
    try {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: null }
      );
      message.channel.send({
        embeds: [
          new EmbedBuilder().setTitle("🔓 DESTRANCADO").setColor(0x00ff00),
        ],
      });
    } catch (e) {
      message.channel.send("Erro.");
    }
  },

  // Destrancar Todos (NOVO)
  handleUnlockdownAll: async (message) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return;
    const channels = message.guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText
    );
    message.channel.send(`🔓 Iniciando Desbloqueio Global...`);

    channels.forEach((channel) => {
      channel.permissionOverwrites
        .edit(message.guild.roles.everyone, { SendMessages: null })
        .catch(() => {});
    });
    message.channel.send(`✅ Todos os canais de texto foram liberados.`);
  },
};
