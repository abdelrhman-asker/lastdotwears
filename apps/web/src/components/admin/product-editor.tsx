'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import {
  createVariant,
  deleteProductImage,
  deleteVariant,
  getAdminProduct,
  listAdminBrands,
  listAdminCategories,
  updateProduct,
  updateProductImage,
  updateVariant,
  uploadProductImage,
} from '@/lib/api/catalog';
import { errorMessage } from '@/lib/api/http-client';
import {
  egpToPiasters,
  productEditSchema,
  variantEditSchema,
  variantSchema,
  type ProductEditFormInput,
  type VariantEditFormInput,
  type VariantFormInput,
} from '@/lib/validation/catalog';
import type { Product, ProductVariant } from '@/types/catalog';

const selectClass = 'h-12 w-full border border-stone-300 bg-white px-3 text-sm outline-none';

function ProductDetailsForm({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: listAdminCategories });
  const brands = useQuery({ queryKey: ['admin', 'brands'], queryFn: listAdminBrands });
  const form = useForm<ProductEditFormInput>({
    defaultValues: {
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceEgp: (product.pricePiasters / 100).toFixed(2),
      salePriceEgp: product.salePricePiasters ? (product.salePricePiasters / 100).toFixed(2) : '',
      categoryId: product.categoryId,
      brandId: product.brandId,
      status: product.status,
      isFeatured: product.isFeatured,
      isNewArrival: product.isNewArrival,
    },
    resolver: zodResolver(productEditSchema),
  });
  const mutation = useMutation({
    mutationFn: (values: ProductEditFormInput) =>
      updateProduct(product.id, {
        name: values.name,
        slug: values.slug,
        description: values.description,
        pricePiasters: egpToPiasters(values.priceEgp),
        salePricePiasters: values.salePriceEgp ? egpToPiasters(values.salePriceEgp) : null,
        categoryId: values.categoryId,
        brandId: values.brandId,
        status: values.status,
        isFeatured: values.isFeatured,
        isNewArrival: values.isNewArrival,
      }),
    onSuccess: (updated) => queryClient.setQueryData(['admin', 'product', product.id], updated),
  });

  return (
    <form
      className="grid gap-5 border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="sm:col-span-2">
        <h2 className="text-lg font-medium">Product details</h2>
      </div>
      {mutation.isError ? (
        <div className="sm:col-span-2">
          <StatusMessage tone="error">{errorMessage(mutation.error)}</StatusMessage>
        </div>
      ) : null}
      {mutation.isSuccess ? (
        <div className="sm:col-span-2">
          <StatusMessage tone="success">Product details saved.</StatusMessage>
        </div>
      ) : null}
      <Field error={form.formState.errors.name?.message} htmlFor="name" label="Name">
        <Input id="name" {...form.register('name')} />
      </Field>
      <Field error={form.formState.errors.slug?.message} htmlFor="slug" label="Slug">
        <Input id="slug" {...form.register('slug')} />
      </Field>
      <div className="sm:col-span-2">
        <Field
          error={form.formState.errors.description?.message}
          htmlFor="description"
          label="Description"
        >
          <textarea
            className="min-h-36 w-full border border-stone-300 p-3 outline-none"
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
        <Input id="priceEgp" {...form.register('priceEgp')} />
      </Field>
      <Field
        error={form.formState.errors.salePriceEgp?.message}
        htmlFor="salePriceEgp"
        label="Sale price (EGP)"
      >
        <Input id="salePriceEgp" {...form.register('salePriceEgp')} />
      </Field>
      <Field htmlFor="categoryId" label="Category">
        <select className={selectClass} id="categoryId" {...form.register('categoryId')}>
          {categories.data?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field htmlFor="brandId" label="Brand">
        <select className={selectClass} id="brandId" {...form.register('brandId')}>
          {brands.data?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field htmlFor="status" label="Status">
        <select className={selectClass} id="status" {...form.register('status')}>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </Field>
      <div className="flex flex-col justify-end gap-3 pb-2 text-sm">
        <label className="flex items-center gap-3">
          <input type="checkbox" {...form.register('isFeatured')} /> Featured
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" {...form.register('isNewArrival')} /> New arrival
        </label>
      </div>
      <div className="sm:col-span-2">
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Saving…' : 'Save product'}
        </Button>
      </div>
    </form>
  );
}

function VariantEditForm({
  onDone,
  productId,
  variant,
}: {
  onDone: () => void;
  productId: string;
  variant: ProductVariant;
}) {
  const queryClient = useQueryClient();
  const form = useForm<VariantEditFormInput>({
    defaultValues: {
      sku: variant.sku,
      size: variant.size,
      colorName: variant.colorName,
      colorHex: variant.colorHex ?? '#111111',
      lowStockThreshold: variant.lowStockThreshold,
      isActive: variant.isActive,
      priceOverrideEgp: variant.priceOverridePiasters
        ? (variant.priceOverridePiasters / 100).toFixed(2)
        : '',
    },
    resolver: zodResolver(variantEditSchema),
  });
  const mutation = useMutation({
    mutationFn: (values: VariantEditFormInput) =>
      updateVariant(productId, variant.id, {
        sku: values.sku,
        size: values.size,
        colorName: values.colorName,
        colorHex: values.colorHex,
        lowStockThreshold: values.lowStockThreshold,
        isActive: values.isActive,
        priceOverridePiasters: values.priceOverrideEgp
          ? egpToPiasters(values.priceOverrideEgp)
          : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      onDone();
    },
  });

  return (
    <form
      className="mt-7 grid gap-4 border-t border-stone-200 pt-6 sm:grid-cols-3"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <p className="text-sm font-medium sm:col-span-3">Editing {variant.sku}</p>
      {mutation.isError ? (
        <div className="sm:col-span-3">
          <StatusMessage tone="error">{errorMessage(mutation.error)}</StatusMessage>
        </div>
      ) : null}
      <Field error={form.formState.errors.sku?.message} htmlFor="editSku" label="SKU">
        <Input id="editSku" {...form.register('sku')} />
      </Field>
      <Field error={form.formState.errors.size?.message} htmlFor="editSize" label="Size">
        <Input id="editSize" {...form.register('size')} />
      </Field>
      <Field error={form.formState.errors.colorName?.message} htmlFor="editColor" label="Color">
        <Input id="editColor" {...form.register('colorName')} />
      </Field>
      <Field error={form.formState.errors.colorHex?.message} htmlFor="editHex" label="Color hex">
        <Input id="editHex" {...form.register('colorHex')} />
      </Field>
      <Field
        error={form.formState.errors.lowStockThreshold?.message}
        htmlFor="editThreshold"
        label="Low-stock level"
      >
        <Input
          id="editThreshold"
          min={0}
          type="number"
          {...form.register('lowStockThreshold', { valueAsNumber: true })}
        />
      </Field>
      <Field
        error={form.formState.errors.priceOverrideEgp?.message}
        htmlFor="editPriceOverride"
        label="Price override (EGP)"
      >
        <Input
          id="editPriceOverride"
          placeholder="Leave empty"
          {...form.register('priceOverrideEgp')}
        />
      </Field>
      <div className="flex items-center gap-4 text-sm sm:col-span-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" {...form.register('isActive')} /> Active
        </label>
      </div>
      <div className="flex items-center gap-3 sm:col-span-3">
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Saving…' : 'Save variant'}
        </Button>
        <Button onClick={onDone} type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function VariantsSection({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const form = useForm<VariantFormInput>({
    defaultValues: {
      sku: '',
      size: '',
      colorName: '',
      colorHex: '#111111',
      stockQuantity: 0,
      lowStockThreshold: 5,
    },
    resolver: zodResolver(variantSchema),
  });
  const create = useMutation({
    mutationFn: (input: VariantFormInput) => createVariant(product.id, input),
    onSuccess: async () => {
      form.reset({
        sku: '',
        size: '',
        colorName: '',
        colorHex: '#111111',
        stockQuantity: 0,
        lowStockThreshold: 5,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
    },
  });
  const remove = useMutation({
    mutationFn: (variantId: string) => deleteVariant(product.id, variantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] }),
  });
  const requestError = create.error ?? remove.error;
  const editing = product.variants.find((variant) => variant.id === editingId) ?? null;

  return (
    <section className="border border-stone-200 bg-white p-5 sm:p-7">
      <h2 className="text-lg font-medium">Variants</h2>
      <p className="mt-1 text-sm text-stone-500">
        Size/color combinations own their SKU and inventory. Re-adding a removed size and color
        restores that variant with its history.
      </p>
      {requestError ? (
        <div className="mt-5">
          <StatusMessage tone="error">{errorMessage(requestError)}</StatusMessage>
        </div>
      ) : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b text-xs text-stone-500 uppercase">
            <tr>
              <th className="py-3">SKU</th>
              <th>Size</th>
              <th>Color</th>
              <th>Stock</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {product.variants.map((variant) => (
              <tr key={variant.id}>
                <td className="py-4 font-medium">{variant.sku}</td>
                <td>{variant.size}</td>
                <td>
                  <span
                    className="mr-2 inline-block size-3 border"
                    style={{ backgroundColor: variant.colorHex ?? undefined }}
                  />
                  {variant.colorName}
                </td>
                <td>{variant.stockQuantity}</td>
                <td>{variant.isActive ? 'Active' : 'Inactive'}</td>
                <td className="text-right whitespace-nowrap">
                  <Button onClick={() => setEditingId(variant.id)} variant="ghost">
                    Edit
                  </Button>
                  <Button
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove ${variant.sku}?`)) remove.mutate(variant.id);
                    }}
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing ? (
        <VariantEditForm
          key={editing.id}
          onDone={() => setEditingId(null)}
          productId={product.id}
          variant={editing}
        />
      ) : (
        <form
          className="mt-7 grid gap-4 border-t border-stone-200 pt-6 sm:grid-cols-3"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <Field error={form.formState.errors.sku?.message} htmlFor="variantSku" label="SKU">
            <Input id="variantSku" {...form.register('sku')} />
          </Field>
          <Field error={form.formState.errors.size?.message} htmlFor="variantSize" label="Size">
            <Input id="variantSize" {...form.register('size')} />
          </Field>
          <Field
            error={form.formState.errors.colorName?.message}
            htmlFor="variantColor"
            label="Color"
          >
            <Input id="variantColor" {...form.register('colorName')} />
          </Field>
          <Field
            error={form.formState.errors.colorHex?.message}
            htmlFor="variantHex"
            label="Color hex"
          >
            <Input id="variantHex" {...form.register('colorHex')} />
          </Field>
          <Field
            error={form.formState.errors.stockQuantity?.message}
            htmlFor="variantStock"
            label="Opening stock"
          >
            <Input
              id="variantStock"
              min={0}
              type="number"
              {...form.register('stockQuantity', { valueAsNumber: true })}
            />
          </Field>
          <Field
            error={form.formState.errors.lowStockThreshold?.message}
            htmlFor="variantThreshold"
            label="Low-stock level"
          >
            <Input
              id="variantThreshold"
              min={0}
              type="number"
              {...form.register('lowStockThreshold', { valueAsNumber: true })}
            />
          </Field>
          <div className="sm:col-span-3">
            <Button disabled={create.isPending} type="submit">
              {create.isPending ? 'Adding…' : 'Add variant'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function ImagesSection({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState('');
  const upload = useMutation({
    mutationFn: (body: FormData) => uploadProductImage(product.id, body),
    onSuccess: async () => {
      setAltText('');
      if (fileRef.current) fileRef.current.value = '';
      await queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
    },
  });
  const metadata = useMutation({
    mutationFn: ({ imageId, isPrimary }: { imageId: string; isPrimary: boolean }) =>
      updateProductImage(product.id, imageId, { isPrimary }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] }),
  });
  const remove = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(product.id, imageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !altText.trim()) return;
    const body = new FormData();
    body.set('file', file);
    body.set('altText', altText.trim());
    upload.mutate(body);
  }

  const requestError = upload.error ?? metadata.error ?? remove.error;
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];
  const sideImage = product.images.find((image) => image.id !== primaryImage?.id);
  return (
    <section className="border border-stone-200 bg-white p-5 sm:p-7">
      <h2 className="text-lg font-medium">Product images</h2>
      <p className="mt-1 text-sm text-stone-500">
        Add two matching product images for the homepage rail: mark the centered front view as
        Primary, then upload the side view as the first secondary image. PNG or WebP with a
        transparent background gives the best result.
      </p>
      {product.images.length < 2 ? (
        <div className="mt-4">
          <StatusMessage>
            Add a side-view image to enable the side-to-front rotation on the homepage.
          </StatusMessage>
        </div>
      ) : null}
      {requestError ? (
        <div className="mt-5">
          <StatusMessage tone="error">{errorMessage(requestError)}</StatusMessage>
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {product.images.map((image) => (
          <article className="border border-stone-200 p-3" key={image.id}>
            <div className="relative aspect-[4/5] bg-stone-100">
              <Image
                alt={image.altText}
                className="object-cover"
                fill
                sizes="(max-width: 768px) 50vw, 240px"
                src={image.secureUrl}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="line-clamp-2 text-sm">{image.altText}</p>
              {image.id === primaryImage?.id ? (
                <span className="shrink-0 bg-stone-950 px-2 py-1 text-[9px] tracking-[0.12em] text-white uppercase">
                  Front
                </span>
              ) : image.id === sideImage?.id ? (
                <span className="shrink-0 bg-amber-100 px-2 py-1 text-[9px] tracking-[0.12em] text-amber-900 uppercase">
                  Side
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex gap-2">
              {!image.isPrimary ? (
                <Button
                  disabled={metadata.isPending}
                  onClick={() => metadata.mutate({ imageId: image.id, isPrimary: true })}
                  variant="secondary"
                >
                  Make primary
                </Button>
              ) : (
                <span className="py-3 text-xs text-emerald-700">Primary</span>
              )}
              <Button
                disabled={remove.isPending}
                onClick={() => remove.mutate(image.id)}
                variant="ghost"
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
      <form
        className="mt-7 grid gap-4 border-t border-stone-200 pt-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={submit}
      >
        <Field htmlFor="imageFile" label="Image file">
          <Input
            accept="image/jpeg,image/png,image/webp,image/avif"
            id="imageFile"
            ref={fileRef}
            type="file"
          />
        </Field>
        <Field htmlFor="imageAlt" label="Alternative text">
          <Input
            id="imageAlt"
            maxLength={180}
            onChange={(event) => setAltText(event.target.value)}
            value={altText}
          />
        </Field>
        <Button disabled={upload.isPending} type="submit">
          {upload.isPending ? 'Uploading…' : 'Upload image'}
        </Button>
      </form>
    </section>
  );
}

export function ProductEditor({ productId }: { productId: string }) {
  const product = useQuery({
    queryKey: ['admin', 'product', productId],
    queryFn: () => getAdminProduct(productId),
    retry: false,
  });
  if (product.isPending) return <StatusMessage>Loading product…</StatusMessage>;
  if (product.isError)
    return <StatusMessage tone="error">{errorMessage(product.error)}</StatusMessage>;
  return (
    <div className="mx-auto max-w-5xl">
      <Link className="text-sm text-stone-500 hover:text-stone-950" href="/admin/catalog/products">
        ← Products
      </Link>
      <div className="mt-5">
        <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Catalog</p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">{product.data.name}</h1>
        <p className="mt-3 text-sm text-stone-600">
          {product.data.stockQuantity} units across {product.data.variants.length} variants.
        </p>
      </div>
      <div className="mt-8 space-y-8">
        <ProductDetailsForm key={product.data.updatedAt} product={product.data} />
        <VariantsSection product={product.data} />
        <ImagesSection product={product.data} />
      </div>
    </div>
  );
}
