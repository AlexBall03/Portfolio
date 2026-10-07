/**
 * Minimal structured logger. One JSON line per event so Vercel's log search
 * and any future drain can filter by `scope` and `level`. This is the single
 * place to wire an error-reporting service later.
 */
type Level = 'info' | 'warn' | 'error';
type Context = Record<string, unknown>;

function serializeError(err: unknown): Context {
  if (err instanceof Error) return { error: err.name, message: err.message };
  return { error: String(err) };
}

function emit(level: Level, scope: string, message: string, context?: Context) {
  const line = JSON.stringify({ level, scope, message, ...context });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (process.env.NODE_ENV !== 'test') console.info(line);
}

export function createLogger(scope: string) {
  return {
    info: (message: string, context?: Context) => emit('info', scope, message, context),
    warn: (message: string, context?: Context) => emit('warn', scope, message, context),
    error: (message: string, err?: unknown, context?: Context) =>
      emit('error', scope, message, { ...context, ...(err === undefined ? {} : serializeError(err)) }),
  };
}

export type Logger = ReturnType<typeof createLogger>;
