import { randomUUID } from 'node:crypto';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  ImageStorage,
  StoredImage,
  StoredImageFile,
} from '../interfaces/image-storage.interface.js';
import {
  imageContentTypes,
  inspectImage,
  type SupportedImageFormat,
} from '../utils/image-metadata.util.js';

@Injectable()
export class LocalImageStorageService implements ImageStorage {
  private readonly apiPrefix: string;
  private readonly uploadRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.apiPrefix = configService.getOrThrow<string>('API_PREFIX').replace(/^\/+|\/+$/gu, '');
    this.uploadRoot = path.resolve(configService.getOrThrow<string>('UPLOAD_ROOT'));
  }

  uploadProductImage(buffer: Buffer, productId: string): Promise<StoredImage> {
    return this.upload(buffer, `products/${productId}`);
  }

  uploadBannerImage(buffer: Buffer): Promise<StoredImage> {
    return this.upload(buffer, 'banners');
  }

  uploadPaymentProof(buffer: Buffer, userId: string): Promise<StoredImage> {
    return this.upload(buffer, `payment-proofs/${userId}`);
  }

  async deleteImage(publicId: string): Promise<void> {
    const filePath = this.resolvePublicId(publicId);
    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async readImage(publicId: string): Promise<StoredImageFile | null> {
    const format = path.extname(publicId).slice(1).toLowerCase() as SupportedImageFormat;
    const contentType = imageContentTypes[format];
    if (!contentType) return null;

    const filePath = this.resolvePublicId(publicId);
    try {
      const file = await stat(filePath);
      if (!file.isFile()) return null;
      return { path: filePath, contentType, bytes: file.size };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  private async upload(buffer: Buffer, folder: string): Promise<StoredImage> {
    const metadata = inspectImage(buffer);
    if (!metadata) {
      throw new BadRequestException('The uploaded image dimensions could not be determined.');
    }

    const publicId = `${folder}/${randomUUID()}.${metadata.format}`;
    const filePath = this.resolvePublicId(publicId);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer, { flag: 'wx' });

    return {
      publicId,
      secureUrl: `/${this.apiPrefix}/uploads/${publicId}`,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      bytes: buffer.length,
    };
  }

  private resolvePublicId(publicId: string): string {
    const segments = publicId.replaceAll('\\', '/').split('/');
    if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
      throw new Error('Invalid stored image identifier.');
    }

    const filePath = path.resolve(this.uploadRoot, ...segments);
    const rootPrefix = `${this.uploadRoot}${path.sep}`.toLowerCase();
    if (!filePath.toLowerCase().startsWith(rootPrefix)) {
      throw new Error('Stored image path escapes the upload root.');
    }
    return filePath;
  }
}
