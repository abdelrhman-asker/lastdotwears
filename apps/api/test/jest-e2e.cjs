const baseConfig = require('../jest.config.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  rootDir: '..',
  testPathIgnorePatterns: [],
  testRegex: '.*\\.e2e-spec\\.ts$',
};
