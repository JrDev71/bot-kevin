const { AuditLogEvent } = require("discord.js");
const { checkSecurity } = require("../../securityManager");

module.exports = {
  name: "roleDelete",
  execute(client, role) {
    checkSecurity(client, role.guild, "ROLE_DELETE", AuditLogEvent.RoleDelete);
  },
};
