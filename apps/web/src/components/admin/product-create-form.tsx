'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { createProduct, listAdminBrands, listAdminCategories } from '@/lib/api/catalog';
import { errorMessage } from '@/lib/api/http-client';
import {
  egpToPiasters,
  productCreateSchema,
  type ProductCreateFormInput,
} from '@/lib/validation/catalog';

const selectClass =
  'h-12 w-full border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-950';

export function ProductCreateForm() {
  const router = useRouter();
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: listAdminCategories });
  const brands = useQuery({ queryKey: ['admin', 'brands'], queryFn: listAdminBrands });
  const form = useForm<ProductCreateFormInput>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      priceEgp: '',
      salePriceEgp: '',
      categoryId: '',
      brandId: '',
      status: 'DRAFT',
      isFeatured: false,
      isNewArrival: true,
      sku: '',
      size: '',
      colorName: '',
      colorHex: '#111111',
      stockQuantity: 0,
      lowStockThreshold: 5,
    },
    resolver: zodResolver(productCreateSchema),
  });
  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => router.replace(`/admin/catalog/products/${product.id}`),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Catalog</p>
      <h1 className="mt-2 text-3xl font-light tracking-tight">New product</h1>
      <p className="mt-3 text-sm text-stone-600">
        Create the product and its first sellable variant.
      </p>

      <form
        className="mt-8 space-y-8"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          mutation.mutate({
            name: values.name,
            ...(values.slug ? { slug: values.slug } : {}),
            description: values.description,
            pricePiasters: egpToPiasters(values.priceEgp),
            ...(values.salePriceEgp
              ? { salePricePiasters: egpToPiasters(values.salePriceEgp) }
              : {}),
            categoryId: values.categoryId,
            brandId: values.brandId,
            status: values.status,
            isFeatured: values.isFeatured,
            isNewArrival: values.isNewArrival,
            variants: [
              {
                sku: values.sku,
                size: values.size,
                colorName: values.colorName,
                colorHex: values.colorHex,
                stockQuantity: values.stockQuantity,
                lowStockThreshold: values.lowStockThreshold,
              },
            ],
          }),
        )}
      >
        {mutation.isError ? (
          <StatusMessage tone="error">{errorMessage(mutation.error)}</StatusMessage>
        ) : null}
        <section className="grid gap-5 border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
          <h2 className="sm:col-span-2 text-lg font-medium">Product details</h2>
          <Field error={form.formState.errors.name?.message} htmlFor="name" label="Name">
            <Input id="name" {...form.register('name')} />
          </Field>
          <Field
            error={form.formState.errors.slug?.message}
            hint="Optional; generated from the name."
            htmlFor="slug"
            label="Slug"
          >
            <Input id="slug" {...form.register('slug')} />
          </Field>
          <div className="sm:col-span-2">
            <Field
              error={form.formState.errors.description?.message}
              htmlFor="description"
              label="Description"
            >
              <textarea
                className="min-h-36 w-full border border-stone-300 p-3 outline-none focus:border-stone-950"
                id="description"
                {...form.register('description')}
              />
            </Field>
          </div>
          <Field
            error={form.formState.errors.priceEgp?.message}
            htmlFor="priceEgp"
            label="Regular price (EGP)"
          >
            <Input
              id="priceEgp"
              inputMode="decimal"
              placeholder="1499.00"
              {...form.register('priceEgp')}
            />
          </Field>
          <Field
            error={form.formState.errors.salePriceEgp?.message}
            htmlFor="salePriceEgp"
            label="Sale price (EGP, optional)"
          >
            <Input id="salePriceEgp" inputMode="decimal" {...form.register('salePriceEgp')} />
          </Field>
          <Field
            error={form.formState.errors.categoryId?.message}
            htmlFor="categoryId"
            label="Category"
          >
            <select className={selectClass} id="categoryId" {...form.register('categoryId')}>
              <option value="">Choose category</option>
              {categories.data?.items
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field error={form.formState.errors.brandId?.message} htmlFor="brandId" label="Brand">
            <select className={selectClass} id="brandId" {...form.register('brandId')}>
              <option value="">Choose brand</option>
              {brands.data?.items
                .filter((item) => item.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field htmlFor="status" label="Initial status">
            <select className={selectClass} id="status" {...form.register('status')}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
            </select>
          </Field>
          <div className="flex flex-col justify-end gap-3 pb-2 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" {...form.register('isFeatured')} /> Featured product
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" {...form.register('isNewArrival')} /> New arrival
            </label>
          </div>
        </section>

        <section className="grid gap-5 border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-medium">First variant</h2>
            <p className="mt-1 text-sm text-stone-500">
              Every size and color combination has its own SKU and stock.
            </p>
          </div>
          <Field error={form.formState.errors.sku?.message} htmlFor="sku" label="SKU">
            <Input id="sku" {...form.register('sku')} />
          </Field>
          <Field error={form.formState.errors.size?.message} htmlFor="size" label="Size">
            <Input id="size" placeholder="M" {...form.register('size')} />
          </Field>
          <Field
            error={form.formState.errors.colorName?.message}
            htmlFor="colorName"
            label="Color name"
          >
            <Input id="colorName" placeholder="Black" {...form.register('colorName')} />
          </Field>
          <Field
            error={form.formState.errors.colorHex?.message}
            htmlFor="colorHex"
            label="Color hex"
          >
            <Input id="colorHex" {...form.register('colorHex')} />
          </Field>
          <Field
            error={form.formState.errors.stockQuantity?.message}
            htmlFor="stockQuantity"
            label="Opening stock"
          >
            <Input
              id="stockQuantity"
              min={0}
              type="number"
              {...form.register('stockQuantity', { valueAsNumber: true })}
            />
          </Field>
          <Field
            error={form.formState.errors.lowStockThreshold?.message}
            htmlFor="lowStockThreshold"
            label="Low-stock threshold"
          >
            <Input
              id="lowStockThreshold"
              min={0}
              type="number"
              {...form.register('lowStockThreshold', { valueAsNumber: true })}
            />
          </Field>
        </section>
        <Button
          disabled={mutation.isPending || categories.isPending || brands.isPending}
          type="submit"
        >
          {mutation.isPending ? 'Creating product…' : 'Create product'}
        </Button>
      </form>
    </div>
  );
}
