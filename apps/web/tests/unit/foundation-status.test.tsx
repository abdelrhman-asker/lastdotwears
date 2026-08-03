import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FoundationStatus } from '@/components/shared/foundation-status';

describe('FoundationStatus', () => {
  it('clearly identifies the temporary foundation stage', () => {
    render(<FoundationStatus />);

    expect(
      screen.getByRole('heading', { name: 'The production foundation is ready.' }),
    ).toBeTruthy();
    expect(screen.getByText('Next review gate: authentication and users')).toBeTruthy();
  });
});
