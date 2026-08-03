import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator.js';
import { BrandResponseDto } from '../dto/brand.dto.js';
import { BrandsService } from '../services/brands.service.js';

@ApiTags('Brands')
@Public()
@Controller('brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'List active brands' })
  @ApiOkResponse({ type: [BrandResponseDto] })
  list(): Promise<BrandResponseDto[]> {
    return this.service.listPublic();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an active brand by slug' })
  @ApiOkResponse({ type: BrandResponseDto })
  get(@Param('slug') slug: string): Promise<BrandResponseDto> {
    return this.service.getPublic(slug);
  }
}
