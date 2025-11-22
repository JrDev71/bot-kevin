const { AuditLogEvent } = require("discord.js");
const { checkSecurity } = require("../../securityManager");

module.exports = {
  name: "channelCreate",
  execute(client, channel) {
    checkSecurity(
      client,
      channel.guild,
      "CHANNEL_CREATE",
      AuditLogEvent.ChannelCreate
    );
  },
};
