import {
  Guild,
  GuildMember,
  PermissionsBitField,
  Role,
} from "discord.js";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { checkUserHasTag } from "./discordUser.js";

export interface SyncResult {
  action: "added" | "removed" | "unchanged" | "error";
  reason: string;
  hasTag: boolean;
  hasRole: boolean;
}

export async function syncMemberTagRole(
  member: GuildMember,
  options: { forceRefresh?: boolean; hasTag?: boolean } = {},
): Promise<SyncResult> {
  const hasTag = options.hasTag ?? (await checkUserHasTag(member.id, options.forceRefresh)).hasTag;

  const role = member.guild.roles.cache.get(config.tagRoleId);
  if (!role) {
    logger.error("ROLE", `Configured role ${config.tagRoleId} not found in guild`);
    return {
      action: "error",
      reason: "Configured role not found in guild",
      hasTag,
      hasRole: false,
    };
  }

  const alreadyHasRole = member.roles.cache.has(config.tagRoleId);

  if (hasTag && !alreadyHasRole) {
    const canAssign = await canManageRole(member.guild, role, member);
    if (!canAssign) {
      return {
        action: "error",
        reason: "Bot cannot assign role (missing permissions or role hierarchy issue)",
        hasTag: true,
        hasRole: false,
      };
    }

    try {
      await member.roles.add(config.tagRoleId);
      logger.info("ROLE", `Added role to user ${member.id} (tag equipped)`);
      return {
        action: "added",
        reason: `Added ${role.name} — user has server tag equipped`,
        hasTag: true,
        hasRole: true,
      };
    } catch (error) {
      logger.error("ROLE", `Failed to add role to user ${member.id}`, error);
      return {
        action: "error",
        reason: `Failed to add role: ${error instanceof Error ? error.message : String(error)}`,
        hasTag: true,
        hasRole: false,
      };
    }
  }

  if (!hasTag && alreadyHasRole) {
    const canAssign = await canManageRole(member.guild, role, member);
    if (!canAssign) {
      return {
        action: "error",
        reason: "Bot cannot remove role (missing permissions or role hierarchy issue)",
        hasTag: false,
        hasRole: true,
      };
    }

    try {
      await member.roles.remove(config.tagRoleId);
      logger.info("ROLE", `Removed role from user ${member.id} (tag removed)`);
      return {
        action: "removed",
        reason: `Removed ${role.name} — user no longer has server tag`,
        hasTag: false,
        hasRole: false,
      };
    } catch (error) {
      logger.error("ROLE", `Failed to remove role from user ${member.id}`, error);
      return {
        action: "error",
        reason: `Failed to remove role: ${error instanceof Error ? error.message : String(error)}`,
        hasTag: false,
        hasRole: true,
      };
    }
  }

  const status = hasTag ? "tag equipped, role present" : "no tag, no role";
  return {
    action: "unchanged",
    reason: status,
    hasTag,
    hasRole: alreadyHasRole,
  };
}

async function canManageRole(
  guild: Guild,
  targetRole: Role,
  member: GuildMember,
): Promise<boolean> {
  const botMember = guild.members.me;
  if (!botMember) return false;

  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    logger.warn("ROLE", "Bot lacks ManageRoles permission");
    return false;
  }

  if (botMember.roles.highest.position <= targetRole.position) {
    logger.warn(
      "ROLE",
      `Bot highest role (${botMember.roles.highest.name}) is below or equal to target role (${targetRole.name})`,
    );
    return false;
  }

  if (member.roles.highest.position >= botMember.roles.highest.position) {
    logger.warn(
      "ROLE",
      `Target member's highest role is above or equal to bot's highest role`,
    );
    return false;
  }

  return true;
}

export async function validateSetup(guild: Guild): Promise<{
  roleExists: boolean;
  botHasPermission: boolean;
  roleIsBelowBot: boolean;
  role: Role | null;
}> {
  const role = guild.roles.cache.get(config.tagRoleId) ?? null;
  const botMember = guild.members.me;

  const roleExists = role !== null;
  const botHasPermission =
    botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles) ?? false;
  const roleIsBelowBot =
    role !== null && botMember !== null
      ? botMember.roles.highest.position > role.position
      : false;

  return { roleExists, botHasPermission, roleIsBelowBot, role };
}
