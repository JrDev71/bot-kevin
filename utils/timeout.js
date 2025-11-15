const timeouts = new Set();

const memberTimeout = (member) => `${member.guild.id}-${member.id}`;

const addMemberToTimeout = (member, time) => {
  timeouts.add(memberTimeout(member));
  setTimeout(() => {
    timeouts.delete(memberTimeout(member));
  }, time);
};

const isMemberTimeouted = (member) => {
  return timeouts.has(memberTimeout(member));
};

module.exports = { addMemberToTimeout, isMemberTimeouted };
