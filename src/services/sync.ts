import { Collection, Guild, GuildMember } from "discord.js";
import { logger } from "../utils/logger.js";
import { syncMemberTagRole, type SyncResult } from "./tagRoleManager.js";

export interface BulkSyncResult {
  total: number;
  added: number;
  removed: number;
  unchanged: number;
  errors: number;
  skipped: number;
}

const CONCURRENCY_LIMIT = 5;
const DELAY_BETWEEN_BATCHES_MS = 1000;

export async function syncAllMembers(
  guild: Guild,
  onProgress?: (processed: number, total: number) => void,
): Promise<BulkSyncResult> {
  const result: BulkSyncResult = {
    total: 0,
    added: 0,
    removed: 0,
    unchanged: 0,
    errors: 0,
    skipped: 0,
  };

  let members: Collection<string, GuildMember>;
  try {
    members = await guild.members.fetch();
  } catch (error) {
    logger.error("SYNC", "Failed to fetch guild members", error);
    return result;
  }

  const memberArray = [...members.values()];
  result.total = memberArray.length;
  logger.info("SYNC", `Starting full sync for ${result.total} members`);

  const batches = chunk(memberArray, CONCURRENCY_LIMIT);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const results = await Promise.allSettled(
      batch.map((member) => syncMemberTagRole(member, { forceRefresh: true })),
    );

    for (const settled of results) {
      if (settled.status === "fulfilled") {
        tallyResult(settled.value, result);
      } else {
        result.errors++;
        logger.error("SYNC", "Unhandled error during sync", settled.reason);
      }
    }

    const processed = Math.min((i + 1) * CONCURRENCY_LIMIT, result.total);
    onProgress?.(processed, result.total);

    if (i < batches.length - 1) {
      await delay(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  logger.info(
    "SYNC",
    `Completed: ${result.total} checked, ${result.added} added, ${result.removed} removed, ${result.unchanged} unchanged, ${result.errors} errors`,
  );

  return result;
}

function tallyResult(res: SyncResult, result: BulkSyncResult): void {
  switch (res.action) {
    case "added":
      result.added++;
      break;
    case "removed":
      result.removed++;
      break;
    case "unchanged":
      result.unchanged++;
      break;
    case "error":
      result.errors++;
      break;
  }
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
