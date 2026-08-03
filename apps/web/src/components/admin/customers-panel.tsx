'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { errorMessage } from '@/lib/api/http-client';
import { listCustomers, setCustomerStatus } from '@/lib/api/users';
import type { UserStatus } from '@/types/user';

const customerQueryRoot = ['admin', 'customers'] as const;

export function CustomersPanel() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);
  const filters = { page, limit: 20, search, status };
  const customers = useQuery({
    queryKey: [...customerQueryRoot, filters],
    queryFn: () => listCustomers(filters),
    retry: false,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: UserStatus }) =>
      setCustomerStatus(id, nextStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerQueryRoot }),
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Customers</p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Customer accounts</h1>
        <p className="mt-3 text-sm text-stone-600">Review accounts and control store access.</p>
      </div>

      <form className="mb-6 flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
        <Input
          aria-label="Search customers"
          className="max-w-md"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search name, email, or phone"
          value={searchInput}
        />
        <select
          aria-label="Filter by status"
          className="h-12 border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950"
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as UserStatus | '');
          }}
          value={status}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOCKED">Blocked</option>
        </select>
        <Button type="submit">Search</Button>
      </form>

      {statusMutation.isError ? (
        <div className="mb-5">
          <StatusMessage tone="error">{errorMessage(statusMutation.error)}</StatusMessage>
        </div>
      ) : null}
      {customers.isPending ? <StatusMessage>Loading customers…</StatusMessage> : null}
      {customers.isError ? (
        <StatusMessage tone="error">{errorMessage(customers.error)}</StatusMessage>
      ) : null}

      {customers.data ? (
        <div className="overflow-hidden border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs tracking-wider text-stone-500 uppercase">
                <tr>
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Mobile</th>
                  <th className="px-5 py-4 font-medium">Verified</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customers.data.items.map((customer) => {
                  const nextStatus: UserStatus =
                    customer.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
                  return (
                    <tr key={customer.id}>
                      <td className="px-5 py-4">
                        <p className="font-medium text-stone-950">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="mt-1 text-stone-500">{customer.email}</p>
                      </td>
                      <td className="px-5 py-4 text-stone-600">{customer.phone ?? '—'}</td>
                      <td className="px-5 py-4 text-stone-600">
                        {customer.isEmailVerified ? 'Yes' : 'No'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            customer.status === 'ACTIVE' ? 'text-emerald-700' : 'text-red-700'
                          }
                        >
                          {customer.status === 'ACTIVE' ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: customer.id, nextStatus })}
                          variant={nextStatus === 'BLOCKED' ? 'danger' : 'secondary'}
                        >
                          {nextStatus === 'BLOCKED' ? 'Block' : 'Unblock'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {customers.data.items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-stone-500">
              No customers match these filters.
            </p>
          ) : null}
          <div className="flex items-center justify-between border-t border-stone-200 px-5 py-4 text-sm">
            <p className="text-stone-500">
              Page {customers.data.page} of {Math.max(customers.data.totalPages, 1)} ·{' '}
              {customers.data.total} customers
            </p>
            <div className="flex gap-2">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                variant="secondary"
              >
                Previous
              </Button>
              <Button
                disabled={page >= customers.data.totalPages}
                onClick={() => setPage((value) => value + 1)}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
