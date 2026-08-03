import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator.js';
import { ShippingRateResponseDto } from '../dto/shipping.dto.js';
import { ShippingService } from '../services/shipping.service.js';

@ApiTags('Shipping')
@Public()
@Controller('shipping/rates')
export class ShippingController {
  constructor(private readonly service: ShippingService) {}

  @Get()
  @ApiOkResponse({ type: [ShippingRateResponseDto] })
  list(): Promise<ShippingRateResponseDto[]> {
    return this.service.listPublic();
  }
}
