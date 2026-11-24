import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';

import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';

import type {
  ImageStorage,
  MediaKind,
  StoredImage,
  StoredImageFile,
} from '../interfaces/image-storage.interface.js';
import {
  imageContentTypes,
  inspectImage,
  type SupportedImageFormat,
} from '../utils/image-metadata.util.js';
import { LocalImageStorageService } from './local-image-storage.service.js';

const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const receiptId = new RegExp(`^lastdot/payment-proofs/${uuid}-(jpeg|png|webp|avif)$`, 'u');
const managedIds: Record<MediaKind, RegExp> = {
  product: new RegExp(`^lastdot/products/${uuid}/${uuid}$`, 'u'),
  banner: new RegExp(`^lastdot/banners/${uuid}$`, 'u'),
  receipt: receiptId,
};

@Injectable()
export class CloudinaryImageStorageService implements ImageStorage {
  constructor(
    config: ConfigService,
    private readonly local: LocalImageStorageService,
  ) {
    cloudinary.config({
      cloud_name: config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
      secure: true,
      upload_prefix: 'https://api.cloudinary.com',
    });
  }

  uploadProductImage(buffer: Buffer, productId: string): Promise<StoredImage> {
    return this.uploadPublic(buffer, `lastdot/products/${productId}`, 1200);
  }

  uploadBannerImage(buffer: Buffer): Promise<StoredImage> {
    return this.uploadPublic(buffer, 'lastdot/banners', 1600);
  }

  async uploadPaymentProof(buffer: Buffer): Promise<Pick<StoredImage, 'publicId'>> {
    const format = this.inspect(buffer).format;
    const folder = 'lastdot/payment-proofs';
    const publicId = `${folder}/${randomUUID()}-${format}`;
    await this.upload(buffer, publicId, folder, 'authenticated');
    return { publicId };
  }

  async deleteImage(publicId: string, kind: MediaKind): Promise<void> {
    if (!managedIds[kind].test(publicId)) return this.local.deleteImage(publicId, kind);
    try {
      const options: UploadApiOptions = {
        resource_type: 'image',
        type: kind === 'receipt' ? 'authenticated' : 'upload',
        invalidate: kind !== 'receipt',
        timeout: 15_000,
      };
      const { result } = (await cloudinary.uploader.destroy(publicId, options)) as {
        result: string;
      };
      if (result !== 'ok' && result !== 'not found') throw new Error('Unexpected deletion result');
    } catch {
      throw new BadGatewayException('Image storage deletion failed.');
    }
  }

  readImage(publicId: string): Promise<StoredImageFile | null> {
    // Public Cloudinary images are delivered directly by its CDN. Keep restored legacy paths.
    return this.local.readImage(publicId);
  }

  async readPaymentProof(publicId: string): Promise<StoredImageFile | null> {
    const format = receiptId.exec(publicId)?.[1] as SupportedImageFormat | undefined;
    if (!format) return this.local.readPaymentProof(publicId);

    try {
      const signedUrl = cloudinary.utils.private_download_url(
        publicId,
        format === 'jpeg' ? 'jpg' : format,
        {
          resource_type: 'image',
          type: 'authenticated',
          expires_at: Math.floor(Date.now() / 1000) + 60,
        },
      );
      const response = await fetch(signedUrl, {
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        if (response.status === 404) return null;
        throw new Error('Storage download failed');
      }
      const contentType = imageContentTypes[format];
      const receivedType = response.headers.get('content-type')?.split(';')[0];
      const contentLength = response.headers.has('content-encoding')
        ? null
        : response.headers.get('content-length');
      const bytes = contentLength === null ? undefined : Number(contentLength);
      if (
        (receivedType !== contentType && receivedType !== 'application/octet-stream') ||
        (bytes !== undefined && (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > 8_000_000))
      ) {
        await response.body.cancel();
        throw new Error('Unexpected receipt response');
      }
      const stream = Readable.fromWeb(response.body as unknown as ReadableStream<Uint8Array>);
      return { stream, contentType, ...(bytes === undefined ? {} : { bytes }) };
    } catch {
      throw new BadGatewayException('Payment receipt storage download failed.');
    }
  }

  private async uploadPublic(buffer: Buffer, folder: string, width: number): Promise<StoredImage> {
    const metadata = this.inspect(buffer);
    const publicId = `${folder}/${randomUUID()}`;
    const result = await this.upload(buffer, publicId, folder, 'upload');
    return {
      publicId,
      secureUrl: cloudinary.url(publicId, {
        analytics: false,
        secure: true,
        resource_type: 'image',
        type: 'upload',
        version: result.version,
        transformation: [{ crop: 'limit', width, quality: 'auto', fetch_format: 'auto' }],
      }),
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      bytes: result.bytes,
    };
  }

  private inspect(buffer: Buffer) {
    const metadata = inspectImage(buffer);
    if (!metadata)
      throw new BadRequestException('The uploaded image dimensions could not be determined.');
    return metadata;
  }

  private upload(
    buffer: Buffer,
    publicId: string,
    folder: string,
    type: 'upload' | 'authenticated',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const fail = () => reject(new BadGatewayException('Image storage upload failed.'));
      try {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            type,
            public_id: publicId,
            asset_folder: folder,
            overwrite: false,
            timeout: 30_000,
          },
          (error, result) => {
            if (error || !result || result.public_id !== publicId || result.type !== type)
              return fail();
            resolve(result);
          },
        );
        stream.once('error', fail);
        stream.end(buffer);
      } catch {
        fail();
      }
    });
  }
}
