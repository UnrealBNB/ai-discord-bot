import pino from 'pino';

const logLevel = process.env['LOG_LEVEL'] || 'info';

export const logger = pino({
  level: logLevel,
  transport: {
    target: 'pino/file',
    options: { destination: 1 }, // stdout
  },
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined,
});

export function createChildLogger(module: string) {
  return logger.child({ module });
}
