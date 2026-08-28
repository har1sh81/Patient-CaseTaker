/**
 * User authentication and role-based access helpers
 */

export type UserRole = 'CLINICIAN' | 'PATIENT_KIOSK';

export interface UserSession {
  userId: string;
  role: UserRole;
  expiresAt: number;
}

export function hasPermission(role: UserRole, action: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    CLINICIAN: ['report:view', 'report:print', 'report:edit'],
    PATIENT_KIOSK: ['kiosk:intake', 'kiosk:checkin', 'report:print'],
  };

  const allowedActions = permissions[role] || [];
  return allowedActions.includes(action);
}
