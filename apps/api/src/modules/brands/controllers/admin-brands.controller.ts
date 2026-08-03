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
  BrandResponseDto,
  CreateBrandDto,
  ListBrandsQueryDto,
  PaginatedBrandsResponseDto,
  UpdateBrandDto,
} from '../dto/brand.dto.js';
import { BrandsService } from '../services/brands.service.js';

@ApiTags('Admin Brands')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/brands')
export class AdminBrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedBrandsResponseDto })
  list(@Query() query: ListBrandsQueryDto): Promise<PaginatedBrandsResponseDto> {
    return this.service.listAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: BrandResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<BrandResponseDto> {
    return this.service.getAdmin(id);
  }

  @Post()
  @ApiOkResponse({ type: BrandResponseDto })
  create(@Body() input: CreateBrandDto): Promise<BrandResponseDto> {
    return this.service.create(input);
  }

  @Patch(':id')
  @ApiOkResponse({ type: BrandResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    return this.service.update(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
