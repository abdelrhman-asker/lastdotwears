import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator.js';
import {
  CreateShippingRateDto,
  ShippingRateResponseDto,
  UpdateShippingRateDto,
} from '../dto/shipping.dto.js';
import { ShippingService } from '../services/shipping.service.js';

@ApiTags('Admin Shipping')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/shipping/rates')
export class AdminShippingController {
  constructor(private readonly service: ShippingService) {}

  @Get()
  @ApiOkResponse({ type: [ShippingRateResponseDto] })
  list(): Promise<ShippingRateResponseDto[]> {
    return this.service.listAdmin();
  }

  @Post()
  @HttpCode(200)
  @ApiOkResponse({ type: ShippingRateResponseDto })
  create(@Body() input: CreateShippingRateDto): Promise<ShippingRateResponseDto> {
    return this.service.create(input);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ShippingRateResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateShippingRateDto,
  ): Promise<ShippingRateResponseDto> {
    return this.service.update(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
