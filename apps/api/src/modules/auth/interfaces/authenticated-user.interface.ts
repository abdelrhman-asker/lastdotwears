import type { UserRole, UserStatus } from '../../users/interfaces/user-record.interface.js';

export interface AuthenticatedUser {
  id: string;
  sessionId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
}
