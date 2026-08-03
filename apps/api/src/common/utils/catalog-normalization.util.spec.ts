import { createCombinationKey, createSlug, normalizeSku } from './catalog-normalization.util.js';

describe('catalog normalization', () => {
  it('creates stable URL slugs from supported names', () => {
    expect(createSlug('  Relaxed Cóttön Shirt  ')).toBe('relaxed-cotton-shirt');
  });

  it('normalizes SKUs and variant combinations consistently', () => {
    expect(normalizeSku(' shirt-blk-m ')).toBe('SHIRT-BLK-M');
    expect(createCombinationKey(' M ', 'Off  White')).toBe('m::off white');
  });
});
