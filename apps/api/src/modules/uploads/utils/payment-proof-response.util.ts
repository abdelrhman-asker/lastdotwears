import { Logger, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

import type { StoredImageFile } from '../interfaces/image-storage.interface.js';

const logger = new Logger('PaymentProofStream');

export function streamPaymentProof(image: StoredImageFile, response: Response): StreamableFile {
  response.set('Cache-Control', 'private, no-store');
  response.once('close', () => {
    image.stream.destroy();
  });
  return new StreamableFile(image.stream, {
    type: image.contentType,
    length: image.bytes,
  })
    .setErrorHandler(() => {
      logger.warn('Payment receipt stream interrupted.');
      if (response.destroyed) return;
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.removeHeader('Content-Length');
      response.status(502).type('text').send('Payment receipt stream failed.');
    })
    .setErrorLogger(() => logger.warn('Payment receipt response interrupted.'));
}
