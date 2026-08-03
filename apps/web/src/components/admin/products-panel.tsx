'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { deleteProduct, listAdminProducts } from '@/lib/api/catalog';
import { errorMessage } from '@/lib/api/http-client';
import type { ProductStatus } from '@/types/catalog';

const productsRoot = ['admin', 'products'] as const;
const money = new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' });

export function ProductsPanel() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [page, setPage] = useState(1);
  const products = useQuery({
    queryKey: [...productsRoot, { page, search, status }],
    queryFn: () => listAdminProducts({ page, search, status }),
    retry: false,
  });
  const remove = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsRoot }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Catalog</p>
          <h1 className="mt-2 text-3xl font-light tracking-tight">Products</h1>
          <p className="mt-3 text-sm text-stone-600">
            Manage product content, variants, images, and visibility.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center bg-stone-950 px-5 text-sm font-medium text-white"
          href="/admin/catalog/products/new"
        >
          New product
        </Link>
      </div>
      <form className="my-7 flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
        <Input
          className="max-w-md"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search name, slug, or SKU"
          value={searchInput}
        />
        <select
          className="h-12 border border-stone-300 bg-white px-3 text-sm"
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as ProductStatus | '');
          }}
          value={status}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Button type="submit">Search</Button>
      </form>
      {remove.isError ? (
        <div className="mb-5">
          <StatusMessage tone="error">{errorMessage(remove.error)}</StatusMessage>
        </div>
      ) : null}
      {products.isPending ? <StatusMessage>Loading products…</StatusMessage> : null}
      {products.isError ? (
        <StatusMessage tone="error">{errorMessage(products.error)}</StatusMessage>
      ) : null}
      {products.data ? (
        <div className="overflow-hidden border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs tracking-wider text-stone-500 uppercase">
                <tr>
                  <th className="px-5 py-4 font-medium">Product</th>
                  <th className="px-5 py-4 font-medium">Category</th>
                  <th className="px-5 py-4 font-medium">Price</th>
                  <th className="px-5 py-4 font-medium">Stock</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.data.items.map((product) => (
                  <tr key={product.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{product.name}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {product.variants.length} variants · {product.brand.name}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-stone-600">{product.category.name}</td>
                    <td className="px-5 py-4">
                      <p>{money.format(product.pricePiasters / 100)}</p>
                      {product.salePricePiasters ? (
                        <p className="text-xs text-red-700">
                          Sale {money.format(product.salePricePiasters / 100)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">{product.stockQuantity}</td>
                    <td className="px-5 py-4">{product.status}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          className="inline-flex min-h-11 items-center border border-stone-300 px-4"
                          href={`/admin/catalog/products/${product.id}`}
                        >
                          Edit
                        </Link>
                        <Button
                          disabled={remove.isPending}
                          onClick={() => {
                            if (window.confirm(`Archive ${product.name}?`))
                              remove.mutate(product.id);
                          }}
                          variant="ghost"
                        >
                          Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-stone-200 px-5 py-4 text-sm">
            <p className="text-stone-500">
              Page {products.data.page} of {Math.max(products.data.totalPages, 1)} ·{' '}
              {products.data.total} products
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
                disabled={page >= products.data.totalPages}
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
