/**
 * Centralized logger for environment-aware logging.
 * Prunes logs in production to prevent leaking sensitive information
 * and to improve performance.
 */

const IS_PROD = import.meta.env.PROD;

export const logger = {
  log: (...args: unknown[]) => {
    if (!IS_PROD) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (!IS_PROD) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // We always want to log errors, even in production, but we could 
    // integrate with a service like Sentry here.
    console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (!IS_PROD) {
      console.info(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (!IS_PROD) {
      console.debug(...args);
    }
  }
};
