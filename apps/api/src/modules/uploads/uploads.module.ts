import { Module } from '@nestjs/common';

import { IMAGE_STORAGE } from './interfaces/image-storage.interface.js';
import { ProductImageFilePipe } from './pipes/product-image-file.pipe.js';
import { CloudinaryImageStorageService } from './services/cloudinary-image-storage.service.js';

@Module({
  providers: [
    CloudinaryImageStorageService,
    { provide: IMAGE_STORAGE, useExisting: CloudinaryImageStorageService },
    ProductImageFilePipe,
  ],
  exports: [IMAGE_STORAGE, ProductImageFilePipe],
})
export class UploadsModule {}
