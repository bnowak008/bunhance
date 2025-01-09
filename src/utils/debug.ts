/**
 * Debug log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Debug configuration
 */
export type DebugConfig = {
  readonly enabled: boolean;
  readonly logLevel: LogLevel;
  readonly logToFile: boolean;
  readonly logFilePath: string;
  readonly includeTimestamp: boolean;
  readonly includeMemory: boolean;
};

/**
 * Debug state
 */
type DebugState = {
  config: DebugConfig;
  logBuffer: string[];
  lastFlush: number;
};

// Initialize debug state
const state: DebugState = {
  config: {
    enabled: process.env.DEBUG === 'true',
    logLevel: (process.env.LOG_LEVEL || 'info') as LogLevel,
    logToFile: process.env.LOG_TO_FILE === 'true',
    logFilePath: process.env.LOG_FILE_PATH || './debug.log',
    includeTimestamp: true,
    includeMemory: true
  },
  logBuffer: [],
  lastFlush: Date.now()
};

/**
 * Log level priorities
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Creates a formatted log message
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  data?: unknown
): string {
  const parts: string[] = [];

  if (state.config.includeTimestamp) {
    parts.push(`[${new Date().toISOString()}]`);
  }

  parts.push(`[${level.toUpperCase()}]`);

  if (state.config.includeMemory) {
    const memory = process.memoryUsage();
    parts.push(`[${Math.round(memory.heapUsed / 1024 / 1024)}MB]`);
  }

  parts.push(message);

  if (data !== undefined) {
    parts.push(JSON.stringify(data, null, 2));
  }

  return parts.join(' ');
}

/**
 * Writes log message to file
 */
async function writeToFile(message: string): Promise<void> {
  if (!state.config.logToFile) return;

  try {
    const file = Bun.file(state.config.logFilePath);
    await file.writer().write(new TextEncoder().encode(message + '\n'));
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Flushes log buffer if needed
 */
async function flushBuffer(): Promise<void> {
  const now = Date.now();
  if (now - state.lastFlush > 1000 && state.logBuffer.length > 0) {
    const messages = state.logBuffer.join('\n') + '\n';
    state.logBuffer = [];
    state.lastFlush = now;
    await writeToFile(messages);
  }
}

/**
 * Logs a message at specified level
 */
function log(level: LogLevel, message: string, data?: unknown): void {
  if (!state.config.enabled || LOG_LEVELS[level] < LOG_LEVELS[state.config.logLevel]) {
    return;
  }

  const formattedMessage = formatLogMessage(level, message, data);
  
  // Always output to console
  console[level](formattedMessage);

  // Buffer file writes
  if (state.config.logToFile) {
    state.logBuffer.push(formattedMessage);
    void flushBuffer();
  }
}

/**
 * Debug utilities
 */
export const debug = {
  debug: (message: string, data?: unknown) => log('debug', message, data),
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
  
  /**
   * Updates debug configuration
   */
  configure: (config: Partial<DebugConfig>): void => {
    state.config = { ...state.config, ...config };
  },
  
  /**
   * Forces immediate flush of log buffer
   */
  flush: async (): Promise<void> => {
    await flushBuffer();
  }
};

// Export individual functions for convenience
export const {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  configure: configureDebug,
  flush: flushDebug
} = debug;

// Remove duplicated logging methods and use existing log function
export function logPerformanceWarning(message: string, data?: unknown): void {
  log('warn', `[Performance] ${message}`, data);
}

export function logBufferOperation(message: string, data?: unknown): void {
  log('debug', `[Buffer] ${message}`, data);
} 