'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import {
  createBrand,
  createCategory,
  deleteBrand,
  deleteCategory,
  listAdminBrands,
  listAdminCategories,
  updateBrand,
  updateCategory,
  type TaxonomyInput,
} from '@/lib/api/catalog';
import { errorMessage } from '@/lib/api/http-client';
import { taxonomySchema, type TaxonomyFormInput } from '@/lib/validation/catalog';
import type { Paginated } from '@/types/catalog';

interface TaxonomyPanelProps {
  kind: 'categories' | 'brands';
}

const defaults: TaxonomyFormInput = {
  name: '',
  slug: '',
  description: '',
  isActive: true,
};

interface TaxonomyRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
}

export function TaxonomyPanel({ kind }: TaxonomyPanelProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const title = kind === 'categories' ? 'Categories' : 'Brands';
  const queryKey = ['admin', kind] as const;
  const form = useForm<TaxonomyFormInput>({
    defaultValues: defaults,
    resolver: zodResolver(taxonomySchema),
  });
  const records = useQuery<Paginated<TaxonomyRecord>>({
    queryKey,
    queryFn: async () =>
      kind === 'categories' ? await listAdminCategories() : await listAdminBrands(),
    retry: false,
  });
  const save = useMutation({
    mutationFn: async ({ id, input }: { id: string | null; input: TaxonomyInput }) => {
      if (kind === 'categories') {
        return id ? await updateCategory(id, input) : await createCategory(input);
      }
      return id ? await updateBrand(id, input) : await createBrand(input);
    },
    onSuccess: async () => {
      setEditingId(null);
      form.reset(defaults);
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => (kind === 'categories' ? deleteCategory(id) : deleteBrand(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const requestError = save.error ?? remove.error ?? records.error;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.5fr)]">
      <section>
        <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Catalog</p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Organize products into clear, customer-facing {kind}.
        </p>

        <form
          className="mt-8 space-y-5 border border-stone-200 bg-white p-5"
          noValidate
          onSubmit={form.handleSubmit((values) =>
            save.mutate({
              id: editingId,
              input: {
                name: values.name,
                ...(values.slug ? { slug: values.slug } : {}),
                description: values.description || null,
                isActive: values.isActive,
              },
            }),
          )}
        >
          <h2 className="text-lg font-medium">
            {editingId
              ? `Edit ${title.slice(0, -1).toLowerCase()}`
              : `New ${title.slice(0, -1).toLowerCase()}`}
          </h2>
          <Field error={form.formState.errors.name?.message} htmlFor="name" label="Name">
            <Input id="name" {...form.register('name')} />
          </Field>
          <Field
            error={form.formState.errors.slug?.message}
            hint="Leave blank to generate from the name."
            htmlFor="slug"
            label="Slug"
          >
            <Input id="slug" placeholder="lowercase-with-hyphens" {...form.register('slug')} />
          </Field>
          <Field
            error={form.formState.errors.description?.message}
            htmlFor="description"
            label="Description"
          >
            <textarea
              className="min-h-28 w-full border border-stone-300 bg-white p-3 text-sm outline-none focus:border-stone-950"
              id="description"
              {...form.register('description')}
            />
          </Field>
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input
              className="size-4 accent-stone-950"
              type="checkbox"
              {...form.register('isActive')}
            />
            Active in the storefront
          </label>
          <div className="flex gap-3">
            <Button disabled={save.isPending} type="submit">
              {save.isPending
                ? 'Saving…'
                : editingId
                  ? 'Save changes'
                  : `Create ${title.slice(0, -1).toLowerCase()}`}
            </Button>
            {editingId ? (
              <Button
                onClick={() => {
                  setEditingId(null);
                  form.reset(defaults);
                }}
                variant="secondary"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="pt-1 xl:pt-20">
        {requestError ? (
          <StatusMessage tone="error">{errorMessage(requestError)}</StatusMessage>
        ) : null}
        {records.isPending ? <StatusMessage>Loading {kind}…</StatusMessage> : null}
        {records.data ? (
          <div className="overflow-hidden border border-stone-200 bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs tracking-wider text-stone-500 uppercase">
                <tr>
                  <th className="px-5 py-4 font-medium">Name</th>
                  <th className="px-5 py-4 font-medium">Products</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {records.data.items.map((record) => (
                  <tr key={record.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{record.name}</p>
                      <p className="mt-1 text-xs text-stone-500">/{record.slug}</p>
                    </td>
                    <td className="px-5 py-4 text-stone-600">{record.productCount}</td>
                    <td
                      className={
                        record.isActive ? 'px-5 py-4 text-emerald-700' : 'px-5 py-4 text-stone-500'
                      }
                    >
                      {record.isActive ? 'Active' : 'Hidden'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => {
                            setEditingId(record.id);
                            form.reset({
                              name: record.name,
                              slug: record.slug,
                              description: record.description ?? '',
                              isActive: record.isActive,
                            });
                          }}
                          variant="secondary"
                        >
                          Edit
                        </Button>
                        <Button
                          disabled={remove.isPending || record.productCount > 0}
                          onClick={() => {
                            if (window.confirm(`Delete ${record.name}?`)) remove.mutate(record.id);
                          }}
                          variant="ghost"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
