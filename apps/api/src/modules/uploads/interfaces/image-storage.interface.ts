export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

export interface StoredImage {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface StoredImageFile {
  path: string;
  contentType: string;
  bytes: number;
}

export interface ImageStorage {
  uploadProductImage(buffer: Buffer, productId: string): Promise<StoredImage>;
  uploadBannerImage(buffer: Buffer): Promise<StoredImage>;
  uploadPaymentProof(buffer: Buffer, userId: string): Promise<StoredImage>;
  deleteImage(publicId: string): Promise<void>;
  readImage(publicId: string): Promise<StoredImageFile | null>;
}
