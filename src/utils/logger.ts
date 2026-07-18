import { config } from "../config.js";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

const currentLevel = LEVELS[config.logLevel] ?? LEVELS.info;

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export const logger = {
  debug(tag: string, message: string): void {
    if (currentLevel <= LEVELS.debug) {
      console.log(`[${timestamp()}] [DEBUG] [${tag}] ${message}`);
    }
  },

  info(tag: string, message: string): void {
    if (currentLevel <= LEVELS.info) {
      console.log(`[${timestamp()}] [INFO] [${tag}] ${message}`);
    }
  },

  warn(tag: string, message: string): void {
    if (currentLevel <= LEVELS.warn) {
      console.warn(`[${timestamp()}] [WARN] [${tag}] ${message}`);
    }
  },

  error(tag: string, message: string, error?: unknown): void {
    if (currentLevel <= LEVELS.error) {
      const suffix = error instanceof Error ? `: ${error.message}` : error ? `: ${String(error)}` : "";
      console.error(`[${timestamp()}] [ERROR] [${tag}] ${message}${suffix}`);
    }
  },
};
