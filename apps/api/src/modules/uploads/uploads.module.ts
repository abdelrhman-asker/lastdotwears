import { Module } from '@nestjs/common';

import { UploadsController } from './controllers/uploads.controller.js';
import { IMAGE_STORAGE } from './interfaces/image-storage.interface.js';
import { PaymentProofImageFilePipe } from './pipes/payment-proof-image-file.pipe.js';
import { ProductImageFilePipe } from './pipes/product-image-file.pipe.js';
import { LocalImageStorageService } from './services/local-image-storage.service.js';

@Module({
  controllers: [UploadsController],
  providers: [
    LocalImageStorageService,
    { provide: IMAGE_STORAGE, useExisting: LocalImageStorageService },
    PaymentProofImageFilePipe,
    ProductImageFilePipe,
  ],
  exports: [IMAGE_STORAGE, PaymentProofImageFilePipe, ProductImageFilePipe],
})
export class UploadsModule {}
