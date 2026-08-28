import { DatabaseService, SupabaseRepository } from './repository';
import { mockDb } from './mock-db';
import type { IntakeSession } from '../../types';

const isMockEnabled = process.env.NEXT_PUBLIC_MOCK_SERVICES_ENABLED !== 'false';

export const db: DatabaseService = isMockEnabled
  ? mockDb
  : new SupabaseRepository();

console.log(`[MediKiosk DB Client] Initialized database client in ${isMockEnabled ? 'MOCK' : 'SUPABASE'} mode.`);

/**
 * Returns true if the session's expiresAt timestamp is in the past.
 * Use this guard in any API route that consumes an existing session
 * to prevent operations on an already-expired session.
 */
export function isSessionExpired(session: IntakeSession): boolean {
  if (!session.expiresAt) return false;
  return new Date(session.expiresAt).getTime() < Date.now();
}

