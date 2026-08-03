import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto.js';
import { AddressResponseDto } from '../dto/address.dto.js';
import {
  ADDRESSES_REPOSITORY,
  type AddressesRepository,
} from '../interfaces/addresses-repository.interface.js';

@Injectable()
export class AddressesService {
  constructor(@Inject(ADDRESSES_REPOSITORY) private readonly repository: AddressesRepository) {}

  async list(userId: string): Promise<AddressResponseDto[]> {
    return (await this.repository.list(userId)).map((address) => AddressResponseDto.from(address));
  }

  async create(userId: string, input: CreateAddressDto): Promise<AddressResponseDto> {
    const result = await this.repository.create(userId, input);
    if (result === 'governorate_unavailable') this.unavailableGovernorate();
    if (result === 'limit_reached') {
      throw new ConflictException('You can save up to 10 delivery addresses.');
    }
    return AddressResponseDto.from(result);
  }

  async update(userId: string, id: string, input: UpdateAddressDto): Promise<AddressResponseDto> {
    const result = await this.repository.update(userId, id, input);
    if (result === 'not_found') throw new NotFoundException('Address not found.');
    if (result === 'governorate_unavailable') this.unavailableGovernorate();
    return AddressResponseDto.from(result);
  }

  setDefault(userId: string, id: string): Promise<AddressResponseDto> {
    return this.update(userId, id, { isDefault: true });
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.repository.remove(userId, id);
    if (result === 'not_found') throw new NotFoundException('Address not found.');
  }

  private unavailableGovernorate(): never {
    throw new BadRequestException('Select an active shipping governorate.');
  }
}
