import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator.js';
import { CategoryResponseDto } from '../dto/category.dto.js';
import { CategoriesService } from '../services/categories.service.js';

@ApiTags('Categories')
@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List active catalog categories' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  list(): Promise<CategoryResponseDto[]> {
    return this.service.listPublic();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an active category by slug' })
  @ApiOkResponse({ type: CategoryResponseDto })
  get(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.service.getPublic(slug);
  }
}
