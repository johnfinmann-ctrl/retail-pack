/**
 * @platform/data — DEN eneste plads i platformen, hvor et repository-lag
 * (i enhver app) skal have kontakt med Supabase-specifik fejlform og
 * skema-opslag. Repositories importerer denne pakke, ALDRIG
 * @supabase/supabase-js's typer direkte til fejlhåndtering.
 *
 * Formål (jf. lag-kravet UI → Services → Repositories → Platform Core →
 * Supabase):
 * - Centraliserer fejl-normalisering (toAppError) ét sted, ikke duplikeret
 *   i hvert repository-kald.
 * - Centraliserer logging af data-fejl (valgfri Logger).
 * - Er det ENESTE sted, der skal ændres, hvis Supabase nogensinde udskiftes
 *   — repositories forbliver uændrede, så længe de holder sig til
 *   DataClient-interfacet.
 *
 * Bevidst IKKE et forsøg på at gengive hele PostgREST's forespørgsel-API
 * (.eq/.ilike/.in/.order osv.) som en abstrakt type — det ville være en
 * unødvendig, skør genopfindelse af et helt forespørgselssprog. Denne pakke
 * ejer kun ENTRY POINT'et (skema/tabel-opslag) og RESULTAT-håndteringen
 * (fejl/logging), ikke selve forespørgselsopbygningen.
 */
import { toAppError } from '@platform/config';
import type { Logger } from '@platform/logging';
import type { SupabaseClient } from '@supabase/supabase-js';

type SchemaScoped = ReturnType<SupabaseClient['schema']>;

/** Formen enhver Supabase/PostgREST-forespørgsel resolver til ved await. */
export interface RawResult<T> {
  data: T | null;
  error: unknown;
}

export interface DataClient {
  /** Skalerer til et Postgres-skema — repositories kalder ALDRIG .schema() på en rå klient selv. */
  schema(schemaName: string): SchemaScoped;

  /** Kør en forespørgsel der forventer ét resultat (eller null). Kaster AppError ved fejl. */
  run<T>(query: PromiseLike<RawResult<T>>): Promise<T>;

  /** Kør en forespørgsel der forventer en liste. Normaliserer null til []. Kaster AppError ved fejl. */
  runMany<T>(query: PromiseLike<RawResult<T[]>>): Promise<T[]>;
}

export function createDataClient(client: SupabaseClient, logger?: Logger): DataClient {
  async function execute<T>(query: PromiseLike<RawResult<T>>): Promise<T> {
    const { data, error } = await query;
    if (error) {
      const appError = toAppError(error);
      logger?.error('Data-kald fejlede', { code: appError.code, message: appError.message });
      throw appError;
    }
    return data as T;
  }

  return {
    schema(schemaName: string) {
      return client.schema(schemaName);
    },
    run<T>(query: PromiseLike<RawResult<T>>) {
      return execute(query);
    },
    async runMany<T>(query: PromiseLike<RawResult<T[]>>) {
      const data = await execute(query);
      return data ?? [];
    },
  };
}
