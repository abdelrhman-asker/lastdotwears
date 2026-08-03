import type { ConfigService } from '@nestjs/config';

import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('returns stable API information', () => {
    const configService = {
      getOrThrow: () => '0.1.0',
    } as unknown as ConfigService;
    const controller = new AppController(configService);

    expect(controller.information()).toEqual({
      name: 'Egypt Fashion Commerce API',
      version: '0.1.0',
      status: 'ok',
    });
  });
});
