import type { Repositories } from '../data/repositories/interfaces';
import type { NewPackSession, PackSession } from '../data/types';

/**
 * Godkendelses-logik. Selve "gem offline hvis ingen forbindelse"-beslutningen
 * ligger bevidst IKKE her, men i UI-laget (Trin 5), som allerede har adgang
 * til @platform/offline's kø — denne service kender kun til "opret en
 * godkendt session", uanset om kaldet sker med det samme eller fra køen.
 */
export class PackSessionService {
  constructor(private readonly repos: Pick<Repositories, 'packSessions'>) {}

  approve(session: NewPackSession): Promise<PackSession> {
    return this.repos.packSessions.create(session);
  }

  myHistory(userId: string): Promise<PackSession[]> {
    return this.repos.packSessions.listOwn(userId);
  }
}
