import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ConfigService } from '@nestjs/config';

import { LocalImageStorageService } from './local-image-storage.service.js';

function png(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe('LocalImageStorageService', () => {
  let uploadRoot: string;
  let service: LocalImageStorageService;

  beforeEach(async () => {
    uploadRoot = await mkdtemp(path.join(tmpdir(), 'commerce-uploads-'));
    const values: Record<string, string> = {
      API_PREFIX: 'api/v1',
      UPLOAD_ROOT: uploadRoot,
    };
    const config = {
      getOrThrow: (key: string) => values[key],
    } as unknown as ConfigService;
    service = new LocalImageStorageService(config);
  });

  afterEach(async () => {
    await rm(uploadRoot, { recursive: true, force: true });
  });

  it('stores, reads, and deletes a product image', async () => {
    const buffer = png(2, 3);
    const productId = '94a65897-2462-4eec-b05f-e68ec839989e';

    const stored = await service.uploadProductImage(buffer, productId);

    expect(stored).toMatchObject({
      width: 2,
      height: 3,
      format: 'png',
      bytes: buffer.length,
    });
    expect(stored.publicId).toMatch(new RegExp(`^products/${productId}/[0-9a-f-]+\\.png$`, 'u'));
    expect(stored.secureUrl).toBe(`/api/v1/uploads/${stored.publicId}`);

    const image = await service.readImage(stored.publicId);
    expect(image).not.toBeNull();
    expect(await readFile(image!.path)).toEqual(buffer);
    expect(image).toMatchObject({ contentType: 'image/png', bytes: buffer.length });

    await service.deleteImage(stored.publicId);
    await expect(service.readImage(stored.publicId)).resolves.toBeNull();
  });

  it('rejects image content without dimensions', async () => {
    const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await expect(service.uploadBannerImage(fakePng)).rejects.toThrow(
      'dimensions could not be determined',
    );
  });

  it('prevents paths from escaping the upload root', async () => {
    await expect(service.readImage('../outside.png')).rejects.toThrow(
      'Invalid stored image identifier',
    );
  });
});
