import { Module } from '@nestjs/common';

import { AdminUsersController } from './controllers/admin-users.controller.js';
import { UsersController } from './controllers/users.controller.js';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface.js';
import { PrismaUsersRepository } from './repositories/prisma-users.repository.js';
import { UsersService } from './services/users.service.js';

@Module({
  controllers: [UsersController, AdminUsersController],
  providers: [
    PrismaUsersRepository,
    {
      provide: USERS_REPOSITORY,
      useExisting: PrismaUsersRepository,
    },
    UsersService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
