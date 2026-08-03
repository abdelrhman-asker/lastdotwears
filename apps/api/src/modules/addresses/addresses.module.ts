import { Module } from '@nestjs/common';

import { AddressesController } from './controllers/addresses.controller.js';
import { ADDRESSES_REPOSITORY } from './interfaces/addresses-repository.interface.js';
import { PrismaAddressesRepository } from './repositories/prisma-addresses.repository.js';
import { AddressesService } from './services/addresses.service.js';

@Module({
  controllers: [AddressesController],
  providers: [
    PrismaAddressesRepository,
    { provide: ADDRESSES_REPOSITORY, useExisting: PrismaAddressesRepository },
    AddressesService,
  ],
  exports: [AddressesService],
})
export class AddressesModule {}
