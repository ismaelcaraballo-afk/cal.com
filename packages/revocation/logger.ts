// Shared logger for revocation providers.
// Providers live outside the NestJS DI container so we use a lightweight
// wrapper instead of injecting Logger — keeps the pattern consistent.

export const revocationLogger = {
  log: (msg: string) => console.log(msg),
  warn: (msg: string) => console.warn(msg),
  error: (msg: string, err?: unknown) => {
    if (err !== undefined) {
      console.error(msg, err);
    } else {
      console.error(msg);
    }
  },
};
