/** Handling ikke tilladt for rollen (demoens rollemodel — ikke Platform Core). */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
