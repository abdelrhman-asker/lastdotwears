import { PassThrough } from 'node:stream';
import { buffer as readStream } from 'node:stream/consumers';

import type { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';

import { CloudinaryImageStorageService } from './cloudinary-image-storage.service.js';
import type { LocalImageStorageService } from './local-image-storage.service.js';

const png = Buffer.from('89504e470d0a1a0a0000000d494844520000000200000003', 'hex');
const productId = '94a65897-2462-4eec-b05f-e68ec839989e';
const receiptId = 'lastdot/payment-proofs/94a65897-2462-4eec-b05f-e68ec839989e-png';

describe('CloudinaryImageStorageService', () => {
  const originalUpload = cloudinary.uploader.upload_stream;
  const originalDestroy = cloudinary.uploader.destroy;
  const originalSignedUrl = cloudinary.utils.private_download_url;
  const originalFetch = globalThis.fetch;
  const legacyReceipts: string[] = [];
  const local = {
    readImage: () => Promise.resolve(null),
    readPaymentProof: (id: string) => {
      legacyReceipts.push(id);
      return Promise.resolve(null);
    },
    deleteImage: () => Promise.resolve(),
  };
  let storage: CloudinaryImageStorageService;

  beforeEach(() => {
    const values: Record<string, string> = {
      CLOUDINARY_CLOUD_NAME: 'fixture-cloud',
      CLOUDINARY_API_KEY: 'fixture-key',
      CLOUDINARY_API_SECRET: 'fixture-secret',
    };
    storage = new CloudinaryImageStorageService(
      { getOrThrow: (key: string) => values[key] } as ConfigService,
      local as unknown as LocalImageStorageService,
    );
  });

  afterEach(() => {
    cloudinary.uploader.upload_stream = originalUpload;
    cloudinary.uploader.destroy = originalDestroy;
    cloudinary.utils.private_download_url = originalSignedUrl;
    globalThis.fetch = originalFetch;
    legacyReceipts.length = 0;
  });

  function mockUpload(fail = false) {
    const uploads: UploadApiOptions[] = [];
    cloudinary.uploader.upload_stream = (...args: unknown[]) => {
      const [options, callback] = args as [
        UploadApiOptions,
        (error?: Error, result?: UploadApiResponse) => void,
      ];
      uploads.push(options);
      const stream = new PassThrough();
      stream.resume();
      stream.once('finish', () => {
        if (fail) return callback(new Error('private fixture detail'));
        callback(undefined, {
          public_id: options.public_id,
          type: options.type,
          bytes: png.length,
          version: 42,
        } as UploadApiResponse);
      });
      return stream;
    };
    return uploads;
  }

  it('uploads public media under managed folders and produces a fixed optimized URL', async () => {
    const upload = mockUpload();
    const product = await storage.uploadProductImage(png, productId);
    expect(product.publicId).toMatch(new RegExp(`^lastdot/products/${productId}/`, 'u'));
    expect(product.secureUrl).toMatch(
      /^https:\/\/res\.cloudinary\.com\/fixture-cloud\/image\/upload\//u,
    );
    expect(product.secureUrl).toContain('w_1200');
    expect(product.secureUrl).toContain('f_auto');
    expect(product.secureUrl).toContain('q_auto');
    const banner = await storage.uploadBannerImage(png);
    expect(banner.publicId).toMatch(/^lastdot\/banners\//u);
    expect(banner.secureUrl).toContain('w_1600');
    expect(upload[0]).toMatchObject({ type: 'upload', overwrite: false });
  });

  it('uploads receipts as authenticated media and returns only their ID', async () => {
    const upload = mockUpload();
    const receipt = await storage.uploadPaymentProof(png);
    expect(Object.keys(receipt)).toEqual(['publicId']);
    expect(receipt.publicId).toMatch(/^lastdot\/payment-proofs\/.*-png$/u);
    expect(upload[0]).toMatchObject({ type: 'authenticated', resource_type: 'image' });
    cloudinary.utils.private_download_url = () => {
      throw new Error('Public reader must never sign a receipt');
    };
    await expect(storage.readImage(receipt.publicId)).resolves.toBeNull();
  });

  it('fetches a short-lived signed receipt internally and returns a stream', async () => {
    const requests: Array<{ url: string; redirect: RequestRedirect | undefined }> = [];
    const signing: Array<Parameters<typeof originalSignedUrl>> = [];
    cloudinary.utils.private_download_url = (...args) => {
      signing.push(args);
      return 'https://api.cloudinary.com/fixture-download';
    };
    globalThis.fetch = (url, options) => {
      if (typeof url !== 'string') throw new Error('Expected a signed URL string');
      requests.push({ url, redirect: options?.redirect });
      return Promise.resolve(
        new Response(new Uint8Array(png), {
          headers: { 'content-type': 'image/png', 'content-length': String(png.length) },
        }),
      );
    };
    const proof = await storage.readPaymentProof(receiptId);
    expect(signing[0]?.slice(0, 2)).toEqual([receiptId, 'png']);
    expect(signing[0]?.[2]).toMatchObject({ type: 'authenticated' });
    expect(signing[0]?.[2].expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(requests).toEqual([
      { url: 'https://api.cloudinary.com/fixture-download', redirect: 'error' },
    ]);
    expect(await readStream(proof!.stream)).toEqual(png);
    expect(proof).not.toHaveProperty('url');
  });

  it('does not delete outside the managed namespace or across media types', async () => {
    const deletions: unknown[][] = [];
    cloudinary.uploader.destroy = (...args: unknown[]) => {
      deletions.push(args);
      return Promise.resolve({ result: 'ok' });
    };
    await storage.deleteImage('other-folder/asset', 'banner');
    await storage.deleteImage(receiptId, 'banner');
    expect(deletions).toEqual([]);
    await storage.deleteImage(receiptId, 'receipt');
    expect(deletions[0]?.[0]).toBe(receiptId);
    expect(deletions[0]?.[1]).toMatchObject({ type: 'authenticated', invalidate: false });
  });

  it('sanitizes provider errors and delegates legacy receipt IDs to local storage', async () => {
    mockUpload(true);
    await expect(storage.uploadBannerImage(png)).rejects.toThrow('Image storage upload failed');
    await expect(storage.readPaymentProof('payment-proofs/legacy/receipt.png')).resolves.toBeNull();
    expect(legacyReceipts).toEqual(['payment-proofs/legacy/receipt.png']);
  });
});
