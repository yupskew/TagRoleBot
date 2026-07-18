import { Events, type Client, type GuildMember } from "discord.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";
import { syncMemberTagRole } from "../services/tagRoleManager.js";

export default function registerGuildMemberAdd(client: Client): void {
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    if (member.guild.id !== config.guildId) return;

    logger.info("EVENT", `Member joined: ${member.id} — checking server tag`);

    const result = await syncMemberTagRole(member, { forceRefresh: true });
    logger.info("EVENT", `Join sync result for ${member.id}: ${result.action} — ${result.reason}`);
  });
}
