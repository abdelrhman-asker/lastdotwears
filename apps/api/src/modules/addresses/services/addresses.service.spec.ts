import type { AddressRecord } from '../interfaces/address.interface.js';
import type { AddressesRepository } from '../interfaces/addresses-repository.interface.js';
import { AddressesService } from './addresses.service.js';

const userId = '453e4148-4e66-4441-bf45-e6f759f42f05';

function address(overrides: Partial<AddressRecord> = {}): AddressRecord {
  const now = new Date('2026-08-03T00:00:00Z');
  return {
    id: '7f64d49c-baa1-407d-b377-63cc339e87d9',
    userId,
    label: 'Home',
    recipientFirstName: 'Mariam',
    recipientLastName: 'Hassan',
    phone: '01012345678',
    governorateCode: 'cairo',
    governorateName: 'Cairo',
    city: 'Nasr City',
    addressLine1: '12 Example Street',
    addressLine2: null,
    postalCode: null,
    deliveryNotes: null,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const createInput = {
  label: 'Home',
  recipientFirstName: 'Mariam',
  recipientLastName: 'Hassan',
  phone: '01012345678',
  governorateCode: 'cairo',
  city: 'Nasr City',
  addressLine1: '12 Example Street',
};

describe('AddressesService', () => {
  it('returns only the authenticated customer address records supplied by the repository', async () => {
    const repository = {
      list: (ownerId: string) => Promise.resolve(ownerId === userId ? [address()] : []),
    } as unknown as AddressesRepository;
    const service = new AddressesService(repository);

    await expect(service.list(userId)).resolves.toEqual([address()]);
  });

  it('maps the address limit to a conflict', async () => {
    const repository = {
      create: () => Promise.resolve('limit_reached' as const),
    } as unknown as AddressesRepository;
    const service = new AddressesService(repository);

    await expect(service.create(userId, createInput)).rejects.toThrow('up to 10');
  });

  it('rejects a governorate that is not currently available for delivery', async () => {
    const repository = {
      create: () => Promise.resolve('governorate_unavailable' as const),
    } as unknown as AddressesRepository;
    const service = new AddressesService(repository);

    await expect(service.create(userId, createInput)).rejects.toThrow(
      'active shipping governorate',
    );
  });

  it('does not expose another customer address through an update', async () => {
    const repository = {
      update: () => Promise.resolve('not_found' as const),
    } as unknown as AddressesRepository;
    const service = new AddressesService(repository);

    await expect(service.update(userId, address().id, { label: 'Office' })).rejects.toThrow(
      'Address not found',
    );
  });

  it('uses the atomic repository update when changing the default address', async () => {
    let received: Parameters<AddressesRepository['update']> | null = null;
    const updated = address({ label: 'Office' });
    const repository = {
      update: (...input: Parameters<AddressesRepository['update']>) => {
        received = input;
        return Promise.resolve(updated);
      },
    } as unknown as AddressesRepository;
    const service = new AddressesService(repository);

    await expect(service.setDefault(userId, updated.id)).resolves.toEqual(updated);
    expect(received).toEqual([userId, updated.id, { isDefault: true }]);
  });
});
