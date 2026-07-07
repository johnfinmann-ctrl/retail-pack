/**
 * Fælles fejlhierarki for hele platformen. Alle pakker og apps kaster/returnerer
 * disse typer i stedet for rå Error, så UI-laget altid kan vise en forståelig,
 * konsekvent besked — jf. PRS §27 Logging / centraliseret {data, error}-mønster.
 */

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'TENANT_MISMATCH'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'OFFLINE_QUEUE_FAILED'
  | 'EXTERNAL_SERVICE_FAILED'
  | 'UNKNOWN';

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  /** Sikkert at vise til slutbrugeren — ingen interne detaljer. */
  userMessage?: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

/**
 * Basisklasse for alle forretnings- og infrastrukturfejl på platformen.
 * Skal ALDRIG indeholde persondata i `message`/`context` ud over det,
 * der er strengt nødvendigt til fejlsøgning (PRS §27).
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly context?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.userMessage = options.userMessage ?? 'Der opstod en fejl. Prøv igen.';
    this.context = options.context;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Brugeren har ikke rettigheder til denne handling') {
    super({ code: 'UNAUTHORIZED', message, userMessage: 'Du har ikke adgang til dette.' });
    this.name = 'UnauthorizedError';
  }
}

export class TenantMismatchError extends AppError {
  constructor(message = 'Forsøg på at tilgå data uden for egen virksomhed') {
    super({
      code: 'TENANT_MISMATCH',
      message,
      userMessage: 'Du har ikke adgang til dette.',
    });
    this.name = 'TenantMismatchError';
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, message = `${entity} blev ikke fundet`) {
    super({ code: 'NOT_FOUND', message, userMessage: 'Kunne ikke findes.' });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      code: 'VALIDATION_FAILED',
      message,
      userMessage: 'Tjek de udfyldte felter og prøv igen.',
      context,
    });
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      code: 'CONFLICT',
      message,
      userMessage: 'Nogen har ændret dette siden du åbnede det. Genindlæs og prøv igen.',
      context,
    });
    this.name = 'ConflictError';
  }
}

/** Normaliserer en ukendt `catch`-fejl til en AppError, uden at tabe stack/cause. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError({ code: 'UNKNOWN', message: error.message, cause: error });
  }
  return new AppError({ code: 'UNKNOWN', message: 'Ukendt fejl', context: { raw: error } });
}
