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
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator.js';
import {
  CategoryResponseDto,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  PaginatedCategoriesResponseDto,
  UpdateCategoryDto,
} from '../dto/category.dto.js';
import { CategoriesService } from '../services/categories.service.js';

@ApiTags('Admin Categories')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedCategoriesResponseDto })
  list(@Query() query: ListCategoriesQueryDto): Promise<PaginatedCategoriesResponseDto> {
    return this.service.listAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: CategoryResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryResponseDto> {
    return this.service.getAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ApiOkResponse({ type: CategoryResponseDto })
  create(@Body() input: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.service.create(input);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ type: CategoryResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.service.update(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
