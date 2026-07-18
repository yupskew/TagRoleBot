import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`[FATAL] Missing required environment variable: ${name}`);
    console.error("Check your .env file or environment configuration.");
    process.exit(1);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  token: requireEnv("DISCORD_TOKEN"),
  clientId: requireEnv("DISCORD_CLIENT_ID"),
  guildId: requireEnv("GUILD_ID"),
  tagRoleId: requireEnv("TAG_ROLE_ID"),
  vcRoleId: requireEnv("VC_ROLE_ID"),
  syncIntervalMs: Number(optionalEnv("SYNC_INTERVAL_MS", String(60 * 60 * 1000))),
  logLevel: optionalEnv("LOG_LEVEL", "info") as "debug" | "info" | "warn" | "error",
} as const;
