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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator.js';
import {
  CouponResponseDto,
  CreateCouponDto,
  ListCouponsQueryDto,
  PaginatedCouponsResponseDto,
  UpdateCouponDto,
} from '../dto/coupon.dto.js';
import { CouponsService } from '../services/coupons.service.js';

@ApiTags('Admin Coupons')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedCouponsResponseDto })
  list(@Query() query: ListCouponsQueryDto): Promise<PaginatedCouponsResponseDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: CouponResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CouponResponseDto> {
    return this.service.get(id);
  }

  @Post()
  @HttpCode(200)
  @ApiOkResponse({ type: CouponResponseDto })
  create(@Body() input: CreateCouponDto): Promise<CouponResponseDto> {
    return this.service.create(input);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CouponResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.service.update(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
