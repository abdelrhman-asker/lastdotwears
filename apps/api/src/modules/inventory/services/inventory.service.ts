import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type {
  InventoryAdjustmentDto,
  InventoryListQueryDto,
  PaginatedInventoryResponseDto,
} from '../dto/inventory.dto.js';
import { InventoryItemResponseDto, InventoryMovementResponseDto } from '../dto/inventory.dto.js';
import {
  INVENTORY_REPOSITORY,
  type InventoryRepository,
} from '../interfaces/inventory-repository.interface.js';

@Injectable()
export class InventoryService {
  constructor(@Inject(INVENTORY_REPOSITORY) private readonly repository: InventoryRepository) {}

  async list(query: InventoryListQueryDto): Promise<PaginatedInventoryResponseDto> {
    const result = await this.repository.list({
      page: query.page,
      limit: query.limit,
      ...(query.search ? { search: query.search } : {}),
      ...(query.lowStock === undefined ? {} : { lowStock: query.lowStock }),
    });
    return {
      items: result.items.map((item) => InventoryItemResponseDto.from(item)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async movements(variantId: string, limit: number): Promise<InventoryMovementResponseDto[]> {
    const movements = await this.repository.movements(variantId, limit);
    if (!movements) throw new NotFoundException('Product variant not found.');
    return movements.map((movement) => InventoryMovementResponseDto.from(movement));
  }

  async adjust(
    actor: AuthenticatedUser,
    variantId: string,
    input: InventoryAdjustmentDto,
  ): Promise<InventoryItemResponseDto> {
    const type = input.type ?? 'ADJUSTMENT';
    if ((type === 'RESTOCK' || type === 'RETURN') && input.quantityDelta < 0) {
      throw new BadRequestException(
        `${type === 'RESTOCK' ? 'Restock' : 'Return'} quantity must be positive.`,
      );
    }
    const result = await this.repository.adjust({
      variantId,
      actorId: actor.id,
      quantityDelta: input.quantityDelta,
      type,
      reason: input.reason,
    });
    if (result.kind === 'not_found') throw new NotFoundException('Product variant not found.');
    if (result.kind === 'insufficient')
      throw new BadRequestException('Inventory cannot become negative.');
    if (result.kind === 'conflict') {
      throw new ConflictException('Inventory changed concurrently. Refresh and try again.');
    }
    return InventoryItemResponseDto.from(result.item);
  }
}
