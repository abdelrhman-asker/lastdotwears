import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CancelOrderButton } from '@/components/storefront/cancel-order-button';
import { cancelOrder } from '@/lib/api/checkout';

vi.mock('@/lib/api/checkout', () => ({ cancelOrder: vi.fn() }));

beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    },
  });
});

afterEach(() => vi.resetAllMocks());

function renderButton(canCancel: boolean) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <CancelOrderButton orderNumber="LDW-TEST" canCancel={canCancel} />
    </QueryClientProvider>,
  );
}

describe('CancelOrderButton', () => {
  it('hides the action for an ineligible order', () => {
    renderButton(false);
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });

  it('requires confirmation, then hides the action after a successful cancellation', async () => {
    vi.mocked(cancelOrder).mockResolvedValue({
      orderNumber: 'LDW-TEST',
      status: 'CANCELLED',
      canCancel: false,
    } as Awaited<ReturnType<typeof cancelOrder>>);
    renderButton(true);
    const action = screen.getByRole('button', { name: 'Cancel order' });
    fireEvent.click(action);
    let dialog = within(screen.getByRole('dialog', { name: 'Cancel order?' }));
    expect(dialog.getByText(/This action cannot be undone/)).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: 'Keep order' }));
    expect(cancelOrder).not.toHaveBeenCalled();
    fireEvent.click(action);
    dialog = within(screen.getByRole('dialog', { name: 'Cancel order?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel order' }));
    await screen.findByText('Your order was cancelled.');
    expect(cancelOrder).toHaveBeenCalledWith('LDW-TEST');
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });
});
