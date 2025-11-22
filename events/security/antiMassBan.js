const { AuditLogEvent } = require("discord.js");
const { checkSecurity } = require("../../securityManager");

module.exports = {
  name: "guildBanAdd",
  execute(client, ban) {
    checkSecurity(client, ban.guild, "BAN_ADD", AuditLogEvent.MemberBanAdd);
  },
};
