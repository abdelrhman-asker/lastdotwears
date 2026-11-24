import type { Readable } from 'node:stream';

export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

export type MediaKind = 'product' | 'banner' | 'receipt';

export interface StoredImage {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface StoredImageFile {
  stream: Readable;
  contentType: string;
  bytes?: number;
}

export interface ImageStorage {
  uploadProductImage(buffer: Buffer, productId: string): Promise<StoredImage>;
  uploadBannerImage(buffer: Buffer): Promise<StoredImage>;
  uploadPaymentProof(buffer: Buffer, userId: string): Promise<Pick<StoredImage, 'publicId'>>;
  deleteImage(publicId: string, kind: MediaKind): Promise<void>;
  readImage(publicId: string): Promise<StoredImageFile | null>;
  readPaymentProof(publicId: string): Promise<StoredImageFile | null>;
}
