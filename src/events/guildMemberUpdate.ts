import { Events, type Client, type GuildMember, type User } from "discord.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";
import { syncMemberTagRole } from "../services/tagRoleManager.js";
import { invalidateUserCache } from "../services/discordUser.js";

export default function registerGuildMemberUpdate(client: Client): void {
  client.on(Events.UserUpdate, async (oldUser: User | { id: string }, newUser: User) => {
    if (newUser.bot) return;
    if (!("primaryGuild" in oldUser)) return;

    const oldPg = oldUser.primaryGuild;
    const newPg = newUser.primaryGuild;

    if (oldPg?.identityGuildId === newPg?.identityGuildId &&
        oldPg?.identityEnabled === newPg?.identityEnabled) {
      return;
    }

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;

    let member: GuildMember | null = null;
    try {
      member = guild.members.cache.get(newUser.id) ?? await guild.members.fetch(newUser.id);
    } catch {
      return;
    }

    const hasTag =
      newPg?.identityEnabled === true &&
      newPg?.identityGuildId === config.guildId;

    logger.info(
      "EVENT",
      `Primary guild changed for user ${newUser.id} — hasTag: ${hasTag}`,
    );

    invalidateUserCache(newUser.id);

    const result = await syncMemberTagRole(member, { hasTag });
    logger.info(
      "EVENT",
      `Tag update sync for ${newUser.id}: ${result.action} — ${result.reason}`,
    );
  });
}
