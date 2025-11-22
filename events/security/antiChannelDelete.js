const { AuditLogEvent } = require("discord.js");
const { checkSecurity } = require("../../securityManager");

module.exports = {
  name: "channelDelete",
  execute(client, channel) {
    checkSecurity(
      client,
      channel.guild,
      "CHANNEL_DELETE",
      AuditLogEvent.ChannelDelete
    );
  },
};
