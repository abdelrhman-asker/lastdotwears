import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { imageContentTypes, inspectImage } from '../utils/image-metadata.util.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const maximumDimension = 20_000;
const maximumPixels = 100_000_000;

@Injectable()
export class ProductImageFilePipe implements PipeTransform<
  Express.Multer.File | undefined,
  Express.Multer.File
> {
  constructor(private readonly configService: ConfigService) {}

  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) throw new BadRequestException('An image file is required.');
    const metadata = inspectImage(file.buffer);
    if (
      !allowedMimeTypes.has(file.mimetype) ||
      !metadata ||
      imageContentTypes[metadata.format] !== file.mimetype
    ) {
      throw new BadRequestException('Only valid JPEG, PNG, WebP, or AVIF images are allowed.');
    }
    if (file.size > this.configService.getOrThrow<number>('PRODUCT_IMAGE_MAX_BYTES')) {
      throw new BadRequestException('The image exceeds the configured size limit.');
    }
    if (
      metadata.width > maximumDimension ||
      metadata.height > maximumDimension ||
      metadata.width * metadata.height > maximumPixels
    ) {
      throw new BadRequestException('The image dimensions exceed the configured safety limit.');
    }
    return file;
  }
}
