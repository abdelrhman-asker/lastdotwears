import { createReadStream } from 'node:fs';

import {
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator.js';
import { IMAGE_STORAGE, type ImageStorage } from '../interfaces/image-storage.interface.js';

const storedFilenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:avif|jpeg|png|webp)$/u;

@ApiTags('uploads')
@Public()
@Controller('uploads')
export class UploadsController {
  constructor(@Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage) {}

  @Get('products/:productId/:filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @ApiOkResponse({ description: 'Stored product image.' })
  @ApiNotFoundResponse({ description: 'Image not found.' })
  productImage(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Param('filename') filename: string,
  ): Promise<StreamableFile> {
    return this.serve(`products/${productId}/${filename}`, filename);
  }

  @Get('banners/:filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @ApiOkResponse({ description: 'Stored homepage banner image.' })
  @ApiNotFoundResponse({ description: 'Image not found.' })
  bannerImage(@Param('filename') filename: string): Promise<StreamableFile> {
    return this.serve(`banners/${filename}`, filename);
  }

  private async serve(publicId: string, filename: string): Promise<StreamableFile> {
    if (!storedFilenamePattern.test(filename)) throw new NotFoundException('Image not found.');
    const image = await this.imageStorage.readImage(publicId);
    if (!image) throw new NotFoundException('Image not found.');

    return new StreamableFile(createReadStream(image.path), {
      type: image.contentType,
      length: image.bytes,
    });
  }
}
