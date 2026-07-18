import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { checkUserHasTag } from "../services/discordUser.js";

export const data = new SlashCommandBuilder()
  .setName("tag")
  .setDescription("Server tag role management")
  .addSubcommand((sub) =>
    sub
      .setName("status")
      .setDescription("Check your current server tag status"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("sync")
      .setDescription("Immediately sync your tag role"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("check")
      .setDescription("Check another user's tag status (admin only)")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("The user to check")
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("sync-all")
      .setDescription("Sync all members (admin only)"),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  switch (sub) {
    case "status":
      return handleStatus(interaction);
    case "sync":
      return handleSync(interaction);
    case "check":
      return handleCheck(interaction);
    case "sync-all":
      return handleSyncAll(interaction);
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const result = await checkUserHasTag(interaction.user.id);
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const hasRole = member?.roles.cache.has(config.tagRoleId) ?? false;

  const lines = [
    "**Server Tag Status**",
    "",
    `**Tag equipped:** ${result.hasTag ? "Yes" : "No"}`,
  ];

  if (result.primaryGuild) {
    lines.push(`**Tag:** ${result.primaryGuild.tag ?? "N/A"}`);
    lines.push(`**Identity enabled:** ${result.primaryGuild.identityEnabled ? "Yes" : "No"}`);
    lines.push(`**Primary guild ID:** ${result.primaryGuild.identityGuildId ?? "None"}`);
  } else {
    lines.push("**Primary guild:** None");
  }

  lines.push("", `**Reward role:** ${hasRole ? "Active" : "Not assigned"}`);

  await interaction.editReply(lines.join("\n"));
}

async function handleSync(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const member = await interaction.guild?.members.fetch(interaction.user.id);
  if (!member) {
    await interaction.editReply("Could not fetch your guild member data.");
    return;
  }

  const { syncMemberTagRole } = await import("../services/tagRoleManager.js");
  const result = await syncMemberTagRole(member, { forceRefresh: true });

  let message: string;
  switch (result.action) {
    case "added":
      message = `Your Server Tag was detected.\n<@&${config.tagRoleId}> has been added.`;
      break;
    case "removed":
      message = "You are not currently displaying this server's tag.\nThe role has been removed.";
      break;
    case "unchanged":
      message = result.hasTag
        ? "Your Server Tag is active and the role is already assigned."
        : "You are not displaying this server's tag. No role to assign.";
      break;
    case "error":
      message = `Sync failed: ${result.reason}`;
      break;
  }

  await interaction.editReply(message);
}

async function handleCheck(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has("Administrator")) {
    await interaction.reply({
      content: "This command requires **Administrator** permission.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.getUser("user", true);
  const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

  if (!member) {
    await interaction.editReply("User not found in this guild.");
    return;
  }

  const result = await checkUserHasTag(targetUser.id, true);
  const hasRole = member.roles.cache.has(config.tagRoleId);

  const lines = [
    "**Tag Check**",
    "",
    `**User:** <@${targetUser.id}> (${targetUser.id})`,
    `**Primary guild ID:** ${result.primaryGuild?.identityGuildId ?? "None"}`,
    `**Identity enabled:** ${result.primaryGuild?.identityEnabled ? "Yes" : "No"}`,
    `**Tag:** ${result.primaryGuild?.tag ?? "N/A"}`,
    `**Eligible:** ${result.hasTag ? "Yes" : "No"}`,
    `**Reward role present:** ${hasRole ? "Yes" : "No"}`,
  ];

  await interaction.editReply(lines.join("\n"));
}

async function handleSyncAll(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has("Administrator")) {
    await interaction.reply({
      content: "This command requires **Administrator** permission.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const { syncAllMembers } = await import("../services/sync.js");

  const result = await syncAllMembers(interaction.guild!, (processed, total) => {
    logger.debug("SYNC", `Progress: ${processed}/${total}`);
  });

  const lines = [
    "**Full Sync Complete**",
    "",
    `**Checked:** ${result.total}`,
    `**Added:** ${result.added}`,
    `**Removed:** ${result.removed}`,
    `**Unchanged:** ${result.unchanged}`,
    `**Errors:** ${result.errors}`,
  ];

  await interaction.editReply(lines.join("\n"));
}
