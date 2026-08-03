import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { RequestMetadata } from '../../auth/interfaces/auth-token.interface.js';
import type {
  ListCustomersQueryDto,
  PaginatedUsersResponseDto,
  SetCustomerStatusDto,
  UpdateProfileDto,
} from '../dto/user.dto.js';
import { UserResponseDto } from '../dto/user.dto.js';
import { toPublicUser } from '../interfaces/user-record.interface.js';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../interfaces/users-repository.interface.js';

@Injectable()
export class UsersService {
  constructor(@Inject(USERS_REPOSITORY) private readonly repository: UsersRepository) {}

  async getById(id: string): Promise<UserResponseDto> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return UserResponseDto.from(toPublicUser(user));
  }

  async getCustomerById(id: string): Promise<UserResponseDto> {
    const user = await this.repository.findById(id);
    if (!user || user.role !== 'CUSTOMER') {
      throw new NotFoundException('Customer not found.');
    }
    return UserResponseDto.from(toPublicUser(user));
  }

  async updateProfile(userId: string, input: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.repository.updateProfile(userId, {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    });
    return UserResponseDto.from(toPublicUser(user));
  }

  async listCustomers(query: ListCustomersQueryDto): Promise<PaginatedUsersResponseDto> {
    const result = await this.repository.listCustomers({
      page: query.page,
      limit: query.limit,
      ...(query.search ? { search: query.search } : {}),
      ...(query.status ? { status: query.status } : {}),
    });

    return {
      items: result.items.map((user) => UserResponseDto.from(user)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async setCustomerStatus(
    actor: AuthenticatedUser,
    targetUserId: string,
    input: SetCustomerStatusDto,
    request: RequestMetadata,
  ): Promise<UserResponseDto> {
    if (actor.id === targetUserId) {
      throw new BadRequestException('You cannot change your own account status.');
    }

    const user = await this.repository.setStatus(
      targetUserId,
      input.status,
      actor.id,
      input.reason ?? null,
      request,
    );
    if (!user) {
      throw new NotFoundException('Customer not found.');
    }
    return UserResponseDto.from(toPublicUser(user));
  }
}
