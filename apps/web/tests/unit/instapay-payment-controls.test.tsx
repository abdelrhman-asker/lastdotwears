import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CopyPaymentValue, InstaPayQr } from '@/components/storefront/instapay-payment-controls';

const qrCode = 'data:image/png;base64,fixture';

afterEach(() => vi.unstubAllGlobals());

describe('InstaPay payment controls', () => {
  it('shows the payment QR and links to the exact configured URL', () => {
    const paymentUrl = 'https://ipn.eg/S/Fixture/instapay/AbC%2F09?token=a%2Bb';
    render(<InstaPayQr paymentUrl={paymentUrl} qrCodeDataUrl={qrCode} />);
    expect(screen.getByRole('img', { name: 'InstaPay transfer QR code' }).getAttribute('src')).toBe(
      qrCode,
    );
    expect(screen.getByRole('link', { name: 'Open InstaPay' }).getAttribute('href')).toBe(
      paymentUrl,
    );
  });

  it.each([
    null,
    'http://ipn.eg/S/fixture',
    'https://ipn.eg.example/S/fixture',
    'https://other@ipn.eg/S/fixture',
  ])('hides the QR and action for an unapproved link (%s)', (paymentUrl) => {
    render(<InstaPayQr paymentUrl={paymentUrl} qrCodeDataUrl={qrCode} />);
    expect(screen.queryByRole('link', { name: 'Open InstaPay' })).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('copies the ID and order reference independently', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(
      <>
        <CopyPaymentValue label="InstaPay ID" value="fixture@instapay" />
        <CopyPaymentValue label="order reference" value="LDW-FIXTURE" />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy InstaPay ID' }));
    await screen.findByText('InstaPay ID copied.');
    fireEvent.click(screen.getByRole('button', { name: 'Copy order reference' }));
    await screen.findByText('order reference copied.');
    expect(writeText.mock.calls).toEqual([['fixture@instapay'], ['LDW-FIXTURE']]);
  });

  it('offers manual copying when clipboard access fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard blocked'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<CopyPaymentValue label="InstaPay ID" value="fixture@instapay" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy InstaPay ID' }));
    await screen.findByText('Could not copy. Select the text to copy it manually.');
    expect(screen.getByText('fixture@instapay')).toBeTruthy();
  });
});
