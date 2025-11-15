// commands/deploy-commands.js
const { REST, Routes } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

const commands = [];
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  if (file === "deploy-commands.js") continue; // ignora ele mesmo
  const command = require(`./${file}`);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(
      `[AVISO] O comando em ${file} está faltando "data" ou "execute".`
    );
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🌀 Atualizando ${commands.length} comando(s) de barra...`);

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Comandos registrados com sucesso.");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:", error);
  }
})();
