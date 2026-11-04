import type { ConfigService } from '@nestjs/config';

import { ProductImageFilePipe } from './product-image-file.pipe.js';

function imageFile(buffer: Buffer, mimetype: string): Express.Multer.File {
  return {
    buffer,
    mimetype,
    size: buffer.length,
    fieldname: 'file',
    originalname: 'product.png',
    encoding: '7bit',
  } as Express.Multer.File;
}

function png(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe('ProductImageFilePipe', () => {
  const config = { getOrThrow: () => 8_000_000 } as unknown as ConfigService;
  const pipe = new ProductImageFilePipe(config);

  it('accepts a valid image signature and MIME type', () => {
    const file = imageFile(png(2, 3), 'image/png');
    expect(pipe.transform(file)).toBe(file);
  });

  it('rejects content that only claims to be an image', () => {
    const file = imageFile(Buffer.from('not an image'), 'image/png');
    expect(() => pipe.transform(file)).toThrow('Only valid JPEG, PNG, WebP, or AVIF');
  });

  it('rejects a MIME type that does not match the image content', () => {
    const file = imageFile(png(2, 3), 'image/jpeg');
    expect(() => pipe.transform(file)).toThrow('Only valid JPEG, PNG, WebP, or AVIF');
  });

  it('rejects unsafe image dimensions', () => {
    const file = imageFile(png(20_001, 1), 'image/png');
    expect(() => pipe.transform(file)).toThrow('dimensions exceed');
  });
});
