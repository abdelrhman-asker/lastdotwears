import type { RequestMetadata } from '../../auth/interfaces/auth-token.interface.js';
import type { PublicUser, UserRecord, UserStatus } from './user-record.interface.js';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface UserListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: UserStatus;
}

export interface UserListResult {
  items: PublicUser[];
  total: number;
}

export interface UsersRepository {
  findById(id: string): Promise<UserRecord | null>;
  updateProfile(
    id: string,
    input: { firstName?: string; lastName?: string; phone?: string | null },
  ): Promise<UserRecord>;
  listCustomers(query: UserListQuery): Promise<UserListResult>;
  setStatus(
    targetUserId: string,
    status: UserStatus,
    actorId: string,
    reason: string | null,
    request: RequestMetadata,
  ): Promise<UserRecord | null>;
}
