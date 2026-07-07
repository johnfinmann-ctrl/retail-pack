/**
 * Struktureret, teknisk logning — adskilt fra forretningslogning (audit.ts),
 * jf. PRS §27. Ingen persondata eller forretningsdata her, kun det
 * nødvendige til fejlsøgning.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  appKey?: string;
  companyId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  fields?: LogFields;
}

/**
 * Standard-implementering: skriver strukturerede JSON-linjer til console.
 * I produktion opsamles disse af Supabase/hosting-platformens logdrain —
 * denne pakke kender ikke til, og skal ikke kende til, hvor logs ender.
 */
export class ConsoleLogger implements Logger {
  constructor(private readonly minLevel: LogLevel = 'info') {}

  private static readonly LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private write(level: LogLevel, message: string, fields?: LogFields): void {
    if (ConsoleLogger.LEVEL_ORDER[level] < ConsoleLogger.LEVEL_ORDER[this.minLevel]) return;

    const entry: StructuredLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(fields ? { fields } : {}),
    };

    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    // eslint-disable-next-line no-console -- dette ER console-implementeringen af Logger
    else console.info(line);
  }

  debug(message: string, fields?: LogFields): void {
    this.write('debug', message, fields);
  }
  info(message: string, fields?: LogFields): void {
    this.write('info', message, fields);
  }
  warn(message: string, fields?: LogFields): void {
    this.write('warn', message, fields);
  }
  error(message: string, fields?: LogFields): void {
    this.write('error', message, fields);
  }
}

/** Til unit-tests: samler log-kald i hukommelsen i stedet for at skrive til console. */
export class InMemoryLogger implements Logger {
  public readonly entries: StructuredLogEntry[] = [];

  private record(level: LogLevel, message: string, fields?: LogFields): void {
    this.entries.push({ level, message, timestamp: new Date().toISOString(), fields });
  }

  debug(message: string, fields?: LogFields): void {
    this.record('debug', message, fields);
  }
  info(message: string, fields?: LogFields): void {
    this.record('info', message, fields);
  }
  warn(message: string, fields?: LogFields): void {
    this.record('warn', message, fields);
  }
  error(message: string, fields?: LogFields): void {
    this.record('error', message, fields);
  }
}
