import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { data } from "./commands/tag.js";

async function deployCommands(): Promise<void> {
  const commandJson = data.toJSON();

  logger.info("DEPLOY", `Deploying command: /${commandJson.name}`);

  const rest = new REST({ version: "10" }).setToken(config.token);

  try {
    const result = (await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: [commandJson] },
    )) as { length: number };

    logger.info("DEPLOY", `Successfully deployed ${result.length} command(s) to guild ${config.guildId}`);
  } catch (error) {
    logger.error("DEPLOY", "Failed to deploy commands", error);
    process.exit(1);
  }
}

deployCommands();
