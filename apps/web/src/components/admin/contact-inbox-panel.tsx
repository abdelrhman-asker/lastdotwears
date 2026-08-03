'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { listContactMessages, updateContactMessage } from '@/lib/api/admin';
import { errorMessage } from '@/lib/api/http-client';
import type { ContactMessage, ContactMessageStatus } from '@/types/settings';

const statuses: Array<{ value: '' | ContactMessageStatus; label: string }> = [
  { value: '', label: 'All messages' },
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'SPAM', label: 'Spam' },
];

export function ContactInboxPanel() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | ContactMessageStatus>('');
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'contact-messages', page, search, status],
    queryFn: () =>
      listContactMessages({ page, search: search || undefined, status: status || undefined }),
    retry: false,
  });
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Customer care</p>
      <h1 className="mt-2 font-serif text-4xl">Contact inbox</h1>
      <p className="mt-3 text-sm text-stone-600">
        Review website messages and record follow-up progress.
      </p>
      <form
        className="mt-8 grid gap-3 border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_220px_auto]"
        onSubmit={submitSearch}
      >
        <Input
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Name, email, subject, or order"
          value={searchInput}
        />
        <select
          className="h-12 border border-stone-300 bg-white px-3 text-sm"
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as '' | ContactMessageStatus);
          }}
          value={status}
        >
          {statuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit">Search</Button>
      </form>
      {query.isPending ? (
        <div className="mt-6">
          <StatusMessage>Loading messages…</StatusMessage>
        </div>
      ) : null}
      {query.isError ? (
        <div className="mt-6">
          <StatusMessage tone="error">{errorMessage(query.error)}</StatusMessage>
        </div>
      ) : null}
      {query.data ? (
        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]">
          <div className="overflow-hidden border border-stone-200 bg-white">
            {query.data.items.length === 0 ? (
              <p className="p-6 text-sm text-stone-500">No messages match these filters.</p>
            ) : null}
            <div className="divide-y divide-stone-100">
              {query.data.items.map((message) => (
                <button
                  className="block w-full p-5 text-left transition hover:bg-stone-50"
                  key={message.id}
                  onClick={() => setSelected(message)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{message.subject}</p>
                    <StatusBadge status={message.status} />
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {message.name} · {message.email}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-600">
                    {message.message}
                  </p>
                  <p className="mt-3 text-[10px] tracking-wider text-stone-400 uppercase">
                    {new Date(message.createdAt).toLocaleString('en-EG')}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-stone-200 p-4 text-xs">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                variant="ghost"
              >
                Previous
              </Button>
              <span>
                Page {query.data.page} of {Math.max(query.data.totalPages, 1)}
              </span>
              <Button
                disabled={page >= query.data.totalPages}
                onClick={() => setPage((value) => value + 1)}
                variant="ghost"
              >
                Next
              </Button>
            </div>
          </div>
          {selected ? (
            <MessageDetail
              key={selected.id + selected.updatedAt}
              message={selected}
              onUpdated={(message) => setSelected(message)}
            />
          ) : (
            <div className="grid min-h-72 place-items-center border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
              Select a message to review it.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MessageDetail({
  message,
  onUpdated,
}: {
  message: ContactMessage;
  onUpdated: (message: ContactMessage) => void;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(message.status);
  const [note, setNote] = useState(message.adminNote ?? '');
  const update = useMutation({
    mutationFn: () => updateContactMessage(message.id, { status, adminNote: note || null }),
    onSuccess: (updated) => {
      onUpdated(updated);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
    },
  });
  return (
    <article className="border border-stone-200 bg-white p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-stone-500">{message.name}</p>
          <h2 className="mt-2 font-serif text-3xl">{message.subject}</h2>
        </div>
        <StatusBadge status={message.status} />
      </div>
      <dl className="mt-7 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-stone-500">Email</dt>
          <dd className="mt-1 break-all">
            <a className="underline" href={`mailto:${message.email}`}>
              {message.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Phone</dt>
          <dd className="mt-1">{message.phone ?? 'Not provided'}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Order</dt>
          <dd className="mt-1">{message.orderNumber ?? 'Not provided'}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Received</dt>
          <dd className="mt-1">{new Date(message.createdAt).toLocaleString('en-EG')}</dd>
        </div>
      </dl>
      <p className="mt-7 whitespace-pre-wrap border-y border-stone-200 py-7 text-sm leading-7">
        {message.message}
      </p>
      {update.isError ? (
        <div className="mt-5">
          <StatusMessage tone="error">{errorMessage(update.error)}</StatusMessage>
        </div>
      ) : null}
      {update.isSuccess ? (
        <div className="mt-5">
          <StatusMessage tone="success">Inbox record updated.</StatusMessage>
        </div>
      ) : null}
      <div className="mt-7 grid gap-5">
        <label className="text-xs text-stone-600">
          Status
          <select
            className="mt-2 block h-12 w-full border border-stone-300 bg-white px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as ContactMessageStatus)}
          >
            {statuses
              .filter((option) => option.value)
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs text-stone-600">
          Internal note
          <textarea
            className="mt-2 min-h-28 w-full border border-stone-300 p-3 text-sm"
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>
      <Button className="mt-6" disabled={update.isPending} onClick={() => update.mutate()}>
        {update.isPending ? 'Saving…' : 'Save follow-up'}
      </Button>
    </article>
  );
}

function StatusBadge({ status }: { status: ContactMessageStatus }) {
  return (
    <span className="shrink-0 border border-stone-300 px-2 py-1 text-[9px] tracking-wider uppercase">
      {status.replaceAll('_', ' ')}
    </span>
  );
}
