import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

import { imageContentTypes, inspectImage } from '../utils/image-metadata.util.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const maximumBytes = 8_000_000;
const maximumDimension = 20_000;
const maximumPixels = 100_000_000;

@Injectable()
export class PaymentProofImageFilePipe implements PipeTransform<
  Express.Multer.File | undefined,
  Express.Multer.File
> {
  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) throw new BadRequestException('A transfer receipt image is required.');
    const metadata = inspectImage(file.buffer);
    if (
      !allowedMimeTypes.has(file.mimetype) ||
      !metadata ||
      imageContentTypes[metadata.format] !== file.mimetype
    ) {
      throw new BadRequestException('Only valid JPEG, PNG, WebP, or AVIF images are allowed.');
    }
    if (file.size > maximumBytes) {
      throw new BadRequestException('The transfer receipt image must be 8 MB or smaller.');
    }
    if (
      metadata.width > maximumDimension ||
      metadata.height > maximumDimension ||
      metadata.width * metadata.height > maximumPixels
    ) {
      throw new BadRequestException('The image dimensions exceed the safety limit.');
    }
    return file;
  }
}
