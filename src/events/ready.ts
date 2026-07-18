import { Events, type Client } from "discord.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";

export default function registerReady(client: Client): void {
  client.once(Events.ClientReady, async (readyClient) => {
    logger.info("READY", `Logged in as ${readyClient.user.tag}`);

    const guild = readyClient.guilds.cache.get(config.guildId);
    if (!guild) {
      logger.error(
        "READY",
        `Bot is not in guild ${config.guildId}. Please invite the bot to your server.`,
      );
      return;
    }

    const vcRole = guild.roles.cache.get(config.vcRoleId);
    if (!vcRole) {
      logger.error(
        "READY",
        `VC role ${config.vcRoleId} not found in guild. Check VC_ROLE_ID.`,
      );
    }

    const tagRole = guild.roles.cache.get(config.tagRoleId);
    if (!tagRole) {
      logger.error(
        "READY",
        `Tag role ${config.tagRoleId} not found in guild. Check TAG_ROLE_ID.`,
      );
    }

    const botMember = guild.members.me;
    if (!botMember) {
      logger.error("READY", "Bot member not found in guild");
      return;
    }

    if (!botMember.permissions.has("ManageRoles")) {
      logger.error("READY", 'Bot lacks "Manage Roles" permission');
    }

    if (vcRole && botMember.roles.highest.position <= vcRole.position) {
      logger.error(
        "READY",
        `Bot highest role is below or equal to VC role "${vcRole.name}". Move the bot's role higher.`,
      );
    }

    if (tagRole && botMember.roles.highest.position <= tagRole.position) {
      logger.error(
        "READY",
        `Bot highest role is below or equal to Tag role "${tagRole.name}". Move the bot's role higher.`,
      );
    }

    logger.info("READY", `Monitoring guild: ${guild.name} (${guild.id})`);

    await syncVCMembersOnStartup(guild);
  });
}

async function syncVCMembersOnStartup(guild: import("discord.js").Guild): Promise<void> {
  logger.info("VC", "Syncing members currently in voice channels...");

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const [, voiceState] of guild.channels.cache.filter((ch) => ch.isVoiceBased())) {
    for (const [, member] of voiceState.members) {
      if (member.user.bot) continue;
      if (member.roles.cache.has(config.vcRoleId)) {
        skipped++;
        continue;
      }

      try {
        await member.roles.add(config.vcRoleId);
        added++;
        logger.debug("VC", `Added VC role to ${member.id} (already in voice)`);
      } catch (error) {
        errors++;
        logger.error("VC", `Failed to add VC role to ${member.id} on startup`, error);
      }
    }
  }

  logger.info("VC", `Startup sync done: ${added} added, ${skipped} already had role, ${errors} errors`);
}
