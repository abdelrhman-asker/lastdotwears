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

describe('ProductImageFilePipe', () => {
  const config = { getOrThrow: () => 8_000_000 } as unknown as ConfigService;
  const pipe = new ProductImageFilePipe(config);

  it('accepts a valid image signature and MIME type', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const file = imageFile(png, 'image/png');
    expect(pipe.transform(file)).toBe(file);
  });

  it('rejects content that only claims to be an image', () => {
    const file = imageFile(Buffer.from('not an image'), 'image/png');
    expect(() => pipe.transform(file)).toThrow('Only valid JPEG, PNG, WebP, or AVIF');
  });
});
