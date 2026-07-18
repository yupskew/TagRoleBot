import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";

import * as tagCommand from "./commands/tag.js";
import registerReady from "./events/ready.js";
import registerGuildMemberAdd from "./events/guildMemberAdd.js";
import registerGuildMemberUpdate from "./events/guildMemberUpdate.js";
import registerVoiceStateUpdate from "./events/voiceStateUpdate.js";

const commands = new Collection<string, (i: ChatInputCommandInteraction) => Promise<void>>();
commands.set(tagCommand.data.name, tagCommand.execute);

export function getCommandJson(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return [tagCommand.data.toJSON()];
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.GuildMember, Partials.User],
});

registerReady(client);
registerGuildMemberAdd(client);
registerGuildMemberUpdate(client);
registerVoiceStateUpdate(client);

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const handler = commands.get(interaction.commandName);
  if (!handler) return;

  try {
    await handler(interaction);
  } catch (error) {
    logger.error("COMMAND", `Error executing /${interaction.commandName}`, error);

    const reply = {
      content: "An error occurred while executing this command.",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

client.login(config.token).catch((error) => {
  logger.error("FATAL", "Failed to log in", error);
  process.exit(1);
});
