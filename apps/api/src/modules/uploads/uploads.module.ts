import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UploadsController } from './controllers/uploads.controller.js';
import { IMAGE_STORAGE } from './interfaces/image-storage.interface.js';
import { PaymentProofImageFilePipe } from './pipes/payment-proof-image-file.pipe.js';
import { ProductImageFilePipe } from './pipes/product-image-file.pipe.js';
import { LocalImageStorageService } from './services/local-image-storage.service.js';
import { CloudinaryImageStorageService } from './services/cloudinary-image-storage.service.js';

@Module({
  controllers: [UploadsController],
  providers: [
    LocalImageStorageService,
    {
      provide: IMAGE_STORAGE,
      inject: [ConfigService, LocalImageStorageService],
      useFactory: (config: ConfigService, local: LocalImageStorageService) =>
        config.getOrThrow<string>('STORAGE_PROVIDER') === 'cloudinary'
          ? new CloudinaryImageStorageService(config, local)
          : local,
    },
    PaymentProofImageFilePipe,
    ProductImageFilePipe,
  ],
  exports: [IMAGE_STORAGE, PaymentProofImageFilePipe, ProductImageFilePipe],
})
export class UploadsModule {}
