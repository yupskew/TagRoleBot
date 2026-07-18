import { REST, Routes, type APIUser } from "discord.js";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { TTLCache } from "./cache.js";

export interface PrimaryGuildInfo {
  identityGuildId: string | null;
  identityEnabled: boolean;
  tag: string | null;
  badge: string | null;
}

export interface UserTagCheck {
  hasTag: boolean;
  primaryGuild: PrimaryGuildInfo | null;
}

const rest = new REST({ version: "10" }).setToken(config.token);

const CACHE_TTL_MS = 5 * 60 * 1000;
const userCache = new TTLCache<APIUser>(CACHE_TTL_MS);

export async function fetchUser(userId: string, forceRefresh = false): Promise<APIUser | null> {
  if (!forceRefresh) {
    const cached = userCache.get(userId);
    if (cached) {
      logger.debug("USER", `Cache hit for user ${userId}`);
      return cached;
    }
  }

  try {
    const response = await rest.get(Routes.user(userId)) as APIUser;
    userCache.set(userId, response);
    logger.debug("USER", `Fetched user ${userId} from API`);
    return response;
  } catch (error: unknown) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      logger.warn("USER", `User ${userId} not found (deleted account?)`);
      return null;
    }
    if (status === 429) {
      logger.warn("USER", `Rate limited fetching user ${userId}, retrying...`);
      await delay(2000);
      try {
        const response = await rest.get(Routes.user(userId)) as APIUser;
        userCache.set(userId, response);
        return response;
      } catch {
        logger.error("USER", `Failed to fetch user ${userId} after retry`);
        return null;
      }
    }
    logger.error("USER", `Failed to fetch user ${userId}`, error);
    return null;
  }
}

export async function checkUserHasTag(userId: string, forceRefresh = false): Promise<UserTagCheck> {
  const user = await fetchUser(userId, forceRefresh);
  if (!user) {
    return { hasTag: false, primaryGuild: null };
  }

  const pg = user.primary_guild;
  if (!pg) {
    return {
      hasTag: false,
      primaryGuild: null,
    };
  }

  const primaryGuild: PrimaryGuildInfo = {
    identityGuildId: pg.identity_guild_id ?? null,
    identityEnabled: pg.identity_enabled === true,
    tag: pg.tag ?? null,
    badge: pg.badge ?? null,
  };

  const hasTag =
    primaryGuild.identityEnabled === true &&
    primaryGuild.identityGuildId === config.guildId;

  return { hasTag, primaryGuild };
}

export function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

export function clearUserCache(): void {
  userCache.clear();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
