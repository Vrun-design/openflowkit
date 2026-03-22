export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  error?: unknown;
  [key: string]: unknown;
}

type ConsoleMethodName = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  scope?: string;
}

function getConsoleMethod(level: LogLevel): ConsoleMethodName {
  switch (level) {
    case 'debug':
      return 'debug';
    case 'info':
      return 'info';
    case 'warn':
      return 'warn';
    case 'error':
      return 'error';
  }
}

function buildLogPrefix(scope?: string): string {
  return scope ? `[${scope}]` : '[app]';
}

function emitLog(level: LogLevel, message: string, metadata?: LogMetadata, options?: LoggerOptions): void {
  if (typeof console === 'undefined') {
    return;
  }

  const consoleMethod = console[getConsoleMethod(level)];
  const prefix = buildLogPrefix(options?.scope);
  if (!metadata || Object.keys(metadata).length === 0) {
    consoleMethod(`${prefix} ${message}`);
    return;
  }

  consoleMethod(`${prefix} ${message}`, metadata);
}

export interface Logger {
  debug: (message: string, metadata?: LogMetadata) => void;
  info: (message: string, metadata?: LogMetadata) => void;
  warn: (message: string, metadata?: LogMetadata) => void;
  error: (message: string, metadata?: LogMetadata) => void;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return {
    debug: (message, metadata) => emitLog('debug', message, metadata, options),
    info: (message, metadata) => emitLog('info', message, metadata, options),
    warn: (message, metadata) => emitLog('warn', message, metadata, options),
    error: (message, metadata) => emitLog('error', message, metadata, options),
  };
}

export const logger = createLogger();
