import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import {
  InventoryAdjustmentDto,
  InventoryItemResponseDto,
  InventoryListQueryDto,
  InventoryMovementResponseDto,
  PaginatedInventoryResponseDto,
} from '../dto/inventory.dto.js';
import { InventoryService } from '../services/inventory.service.js';

@ApiTags('Admin Inventory')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedInventoryResponseDto })
  list(@Query() query: InventoryListQueryDto): Promise<PaginatedInventoryResponseDto> {
    return this.service.list(query);
  }

  @Get(':variantId/movements')
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiOkResponse({ type: [InventoryMovementResponseDto] })
  movements(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Query('limit') limitValue?: string,
  ): Promise<InventoryMovementResponseDto[]> {
    const parsed = Number(limitValue ?? 50);
    const limit = Number.isInteger(parsed) && parsed >= 1 && parsed <= 200 ? parsed : 50;
    return this.service.movements(variantId, limit);
  }

  @Post(':variantId/adjustments')
  @ApiOperation({ summary: 'Atomically adjust variant inventory and record the movement' })
  @ApiOkResponse({ type: InventoryItemResponseDto })
  adjust(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() input: InventoryAdjustmentDto,
  ): Promise<InventoryItemResponseDto> {
    return this.service.adjust(actor, variantId, input);
  }
}
