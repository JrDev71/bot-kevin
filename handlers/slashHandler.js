// handlers/slashHandler.js
module.exports = async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "Erro ao executar comando.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "Erro ao executar comando.",
        ephemeral: true,
      });
    }
  }
};
