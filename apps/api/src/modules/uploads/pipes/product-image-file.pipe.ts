import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function hasImageSignature(buffer: Buffer): boolean {
  const jpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const isoBrand = buffer.length >= 12 ? buffer.subarray(8, 12).toString('ascii') : '';
  const avif =
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
    ['avif', 'avis'].includes(isoBrand);
  return jpeg || png || webp || avif;
}

@Injectable()
export class ProductImageFilePipe implements PipeTransform<
  Express.Multer.File | undefined,
  Express.Multer.File
> {
  constructor(private readonly configService: ConfigService) {}

  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) throw new BadRequestException('An image file is required.');
    if (!allowedMimeTypes.has(file.mimetype) || !hasImageSignature(file.buffer)) {
      throw new BadRequestException('Only valid JPEG, PNG, WebP, or AVIF images are allowed.');
    }
    if (file.size > this.configService.getOrThrow<number>('PRODUCT_IMAGE_MAX_BYTES')) {
      throw new BadRequestException('The image exceeds the configured size limit.');
    }
    return file;
  }
}
