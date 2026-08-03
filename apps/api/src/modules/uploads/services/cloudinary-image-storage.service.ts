import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

import type { ImageStorage, StoredImage } from '../interfaces/image-storage.interface.js';

@Injectable()
export class CloudinaryImageStorageService implements ImageStorage {
  private readonly configured: boolean;
  private readonly folder: string;

  constructor(private readonly configService: ConfigService) {
    const cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = configService.get<string>('CLOUDINARY_API_SECRET');
    this.configured = Boolean(cloudName && apiKey && apiSecret);
    this.folder = configService.getOrThrow<string>('CLOUDINARY_PRODUCT_FOLDER');
    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  uploadProductImage(buffer: Buffer, productId: string): Promise<StoredImage> {
    return this.upload(buffer, `${this.folder}/${productId}`, ['product-image']);
  }

  uploadBannerImage(buffer: Buffer): Promise<StoredImage> {
    return this.upload(buffer, `${this.folder}/homepage-banners`, ['homepage-banner']);
  }

  private upload(buffer: Buffer, folder: string, tags: string[]): Promise<StoredImage> {
    this.assertConfigured();
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
          overwrite: false,
          unique_filename: true,
          use_filename: false,
          tags,
        },
        (error, result) => {
          if (error || !result) {
            reject(new Error(error?.message ?? 'Cloudinary did not return an upload result.'));
            return;
          }
          resolve(this.mapUpload(result));
        },
      );
      stream.end(buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    this.assertConfigured();
    const result = (await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    })) as { result?: string };
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error('Cloudinary could not delete the image.');
    }
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException('Product image storage is not configured.');
    }
  }

  private mapUpload(result: UploadApiResponse): StoredImage {
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }
}
