// commands/voice.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");

module.exports = {
  handleVoice: async (message, args, command) => {
    // Apenas Staff pode mandar o bot entrar/sair (Segurança)
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      return message.reply(
        "<:cadeado:1443642375833518194> Você não tem permissão para controlar o bot na call."
      );
    }

    const voiceChannel = message.member.voice.channel;

    // --- COMANDO: k!join ---
    if (command === "join" || command === "entrar") {
      if (!voiceChannel) {
        return message.reply(
          "<:Nao:1443642030637977743> Você precisa estar em um canal de voz primeiro!"
        );
      }

      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          selfDeaf: false, // Se true, o bot entra "ensurdecido"
          selfMute: false,
        });

        message.channel.send(`🔊 Conectado ao canal **${voiceChannel.name}**!`);
      } catch (error) {
        console.error(error);
        message.channel.send(
          "<:Nao:1443642030637977743> Erro ao tentar conectar."
        );
      }
    }

    // --- COMANDO: k!leave ---
    if (command === "leave" || command === "sair") {
      const connection = getVoiceConnection(message.guild.id);

      if (!connection) {
        return message.reply(
          "<:Nao:1443642030637977743> Eu não estou conectado em nenhum canal de voz."
        );
      }

      connection.destroy();
      message.channel.send("👋 Desconectado do canal de voz.");
    }
  },
};
