/**
 * Log structuré (une ligne JSON par événement) vers stdout/stderr.
 * Récupérable tel quel dans les logs Render, ou vers un collecteur (Better Stack…).
 * Zéro dépendance.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Level[] = ['debug', 'info', 'warn', 'error'];

const MIN: Level =
  (process.env.LOG_LEVEL as Level) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function serialize(_key: string, value: unknown) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (ORDER.indexOf(level) < ORDER.indexOf(MIN)) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...fields }, serialize);
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n');
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
};
