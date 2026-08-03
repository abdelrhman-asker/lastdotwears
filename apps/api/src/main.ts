import 'reflect-metadata';

import { bootstrap } from './bootstrap.js';

void bootstrap().catch((error: unknown) => {
  const serializedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: 'Unknown bootstrap error' };

  process.stderr.write(`${JSON.stringify(serializedError)}\n`);
  process.exitCode = 1;
});
