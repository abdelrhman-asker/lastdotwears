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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ProductImageFilePipe } from '../../uploads/pipes/product-image-file.pipe.js';
import {
  AdminProductListQueryDto,
  CreateProductDto,
  CreateProductVariantDto,
  PaginatedProductsResponseDto,
  ProductImageResponseDto,
  ProductResponseDto,
  ProductVariantResponseDto,
  UpdateProductDto,
  UpdateProductImageDto,
  UpdateProductVariantDto,
  UploadProductImageDto,
} from '../dto/product.dto.js';
import { ProductsService } from '../services/products.service.js';

@ApiTags('Admin Products')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedProductsResponseDto })
  list(@Query() query: AdminProductListQueryDto): Promise<PaginatedProductsResponseDto> {
    return this.service.listAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.service.getAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product and its initial variants' })
  @ApiOkResponse({ type: ProductResponseDto })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.service.create(actor, input);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.service.update(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }

  @Post(':id/variants')
  @ApiOkResponse({ type: ProductVariantResponseDto })
  createVariant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateProductVariantDto,
  ): Promise<ProductVariantResponseDto> {
    return this.service.createVariant(actor, id, input);
  }

  @Patch(':id/variants/:variantId')
  @ApiOkResponse({ type: ProductVariantResponseDto })
  updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() input: UpdateProductVariantDto,
  ): Promise<ProductVariantResponseDto> {
    return this.service.updateVariant(id, variantId, input);
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(204)
  @ApiNoContentResponse()
  async removeVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<void> {
    await this.service.removeVariant(id, variantId);
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20_000_000, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'altText'],
      properties: {
        file: { type: 'string', format: 'binary' },
        altText: { type: 'string', maxLength: 180 },
        position: { type: 'integer', minimum: 0 },
        isPrimary: { type: 'boolean' },
      },
    },
  })
  @ApiOkResponse({ type: ProductImageResponseDto })
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ProductImageFilePipe) file: Express.Multer.File,
    @Body() input: UploadProductImageDto,
  ): Promise<ProductImageResponseDto> {
    return this.service.uploadImage(id, file, input);
  }

  @Patch(':id/images/:imageId')
  @ApiOkResponse({ type: ProductImageResponseDto })
  updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() input: UpdateProductImageDto,
  ): Promise<ProductImageResponseDto> {
    return this.service.updateImage(id, imageId, input);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(204)
  @ApiNoContentResponse()
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<void> {
    await this.service.removeImage(id, imageId);
  }
}
