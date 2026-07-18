import { Events, type Client, type VoiceState } from "discord.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";

export default function registerVoiceStateUpdate(client: Client): void {
  client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
    const guildId = newState.guild.id;
    if (guildId !== config.guildId) return;

    const memberId = newState.member?.id ?? oldState.member?.id;
    if (!memberId) return;

    const member = newState.member ?? oldState.member;
    if (!member) return;

    const joined = !oldState.channelId && newState.channelId;
    const left = oldState.channelId && !newState.channelId;

    if (joined) {
      if (member.roles.cache.has(config.vcRoleId)) return;

      try {
        await member.roles.add(config.vcRoleId);
        logger.info("VC", `Added VC role to ${memberId} (joined voice)`);
      } catch (error) {
        logger.error("VC", `Failed to add VC role to ${memberId}`, error);
      }
    } else if (left) {
      if (!member.roles.cache.has(config.vcRoleId)) return;

      try {
        await member.roles.remove(config.vcRoleId);
        logger.info("VC", `Removed VC role from ${memberId} (left voice)`);
      } catch (error) {
        logger.error("VC", `Failed to remove VC role from ${memberId}`, error);
      }
    }
  });
}
