import { Module } from '@nestjs/common';

import { AdminCategoriesController } from './controllers/admin-categories.controller.js';
import { CategoriesController } from './controllers/categories.controller.js';
import { CATEGORIES_REPOSITORY } from './interfaces/categories-repository.interface.js';
import { PrismaCategoriesRepository } from './repositories/prisma-categories.repository.js';
import { CategoriesService } from './services/categories.service.js';

@Module({
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [
    PrismaCategoriesRepository,
    { provide: CATEGORIES_REPOSITORY, useExisting: PrismaCategoriesRepository },
    CategoriesService,
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
