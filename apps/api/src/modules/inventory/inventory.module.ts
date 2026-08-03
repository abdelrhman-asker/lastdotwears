import { Module } from '@nestjs/common';

import { AdminInventoryController } from './controllers/admin-inventory.controller.js';
import { INVENTORY_REPOSITORY } from './interfaces/inventory-repository.interface.js';
import { PrismaInventoryRepository } from './repositories/prisma-inventory.repository.js';
import { InventoryService } from './services/inventory.service.js';

@Module({
  controllers: [AdminInventoryController],
  providers: [
    PrismaInventoryRepository,
    { provide: INVENTORY_REPOSITORY, useExisting: PrismaInventoryRepository },
    InventoryService,
  ],
})
export class InventoryModule {}
