import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator.js';
import {
  PaginatedProductsResponseDto,
  ProductListQueryDto,
  ProductResponseDto,
} from '../dto/product.dto.js';
import { ProductsService } from '../services/products.service.js';

@ApiTags('Products')
@Public()
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and filter active products' })
  @ApiOkResponse({ type: PaginatedProductsResponseDto })
  list(@Query() query: ProductListQueryDto): Promise<PaginatedProductsResponseDto> {
    return this.service.listPublic(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an active product by slug' })
  @ApiOkResponse({ type: ProductResponseDto })
  get(@Param('slug') slug: string): Promise<ProductResponseDto> {
    return this.service.getPublic(slug);
  }
}
