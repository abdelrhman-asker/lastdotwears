'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import {
  createHomepageBanner,
  createSocialLink,
  deleteHomepageBanner,
  deleteSocialLink,
  getAdminSettings,
  listHomepageBanners,
  listSocialLinks,
  updateAdminSettings,
  updateHomepageBanner,
  updateSocialLink,
  uploadHomepageBannerImage,
} from '@/lib/api/admin';
import { errorMessage } from '@/lib/api/http-client';
import type {
  HomepageBanner,
  HomepageBannerWriteInput,
  SocialLink,
  SocialLinkWriteInput,
  WebsiteSettings,
} from '@/types/settings';

const settingsKey = ['admin', 'settings'] as const;
const socialKey = ['admin', 'settings', 'social'] as const;
const bannersKey = ['admin', 'settings', 'banners'] as const;

interface SettingsFormValues {
  storeName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  storeAddress: string;
  businessHours: string;
  announcementText: string;
  announcementEnabled: boolean;
  cashOnDeliveryEnabled: boolean;
  instaPayEnabled: boolean;
  instaPayId: string;
  instaPayQrValue: string;
  instaPayInstructions: string;
}

export function SettingsPanel() {
  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">Website</p>
      <h1 className="mt-2 font-serif text-4xl">Store settings</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        Control customer-care details, checkout availability, InstaPay instructions, social links,
        and scheduled homepage campaigns.
      </p>
      <div className="mt-10 space-y-10">
        <WebsiteSettingsEditor />
        <SocialLinksEditor />
        <BannersEditor />
      </div>
    </div>
  );
}

function WebsiteSettingsEditor() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: settingsKey, queryFn: getAdminSettings, retry: false });
  const form = useForm<SettingsFormValues>();
  const update = useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKey, settings);
      resetSettings(form.reset, settings);
    },
  });
  useEffect(() => {
    if (query.data) resetSettings(form.reset, query.data);
  }, [form.reset, query.data]);

  if (query.isPending) return <StatusMessage>Loading store settings…</StatusMessage>;
  if (query.isError) return <StatusMessage tone="error">{errorMessage(query.error)}</StatusMessage>;

  return (
    <Section title="Store and payment configuration">
      <form
        onSubmit={form.handleSubmit((input) =>
          update.mutate({
            ...input,
            contactPhone: input.contactPhone || null,
            storeAddress: input.storeAddress || null,
            announcementText: input.announcementText || null,
            instaPayQrValue: input.instaPayQrValue || null,
          }),
        )}
      >
        {update.isError ? (
          <div className="mb-5">
            <StatusMessage tone="error">{errorMessage(update.error)}</StatusMessage>
          </div>
        ) : null}
        {update.isSuccess ? (
          <div className="mb-5">
            <StatusMessage tone="success">Settings saved.</StatusMessage>
          </div>
        ) : null}
        <div className="grid gap-5 md:grid-cols-2">
          <Label text="Store name">
            <Input required {...form.register('storeName')} />
          </Label>
          <Label text="Customer-care email">
            <Input required type="email" {...form.register('contactEmail')} />
          </Label>
          <Label text="Tagline">
            <Input required {...form.register('tagline')} />
          </Label>
          <Label text="Customer-care phone">
            <Input {...form.register('contactPhone')} />
          </Label>
          <Label text="Business hours">
            <Input required {...form.register('businessHours')} />
          </Label>
          <Label text="Store address">
            <Input {...form.register('storeAddress')} />
          </Label>
          <div className="md:col-span-2">
            <Label text="Announcement text">
              <Input maxLength={180} {...form.register('announcementText')} />
            </Label>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Checkbox label="Show announcement" registration={form.register('announcementEnabled')} />
          <Checkbox
            label="Cash on delivery"
            registration={form.register('cashOnDeliveryEnabled')}
          />
          <Checkbox label="InstaPay" registration={form.register('instaPayEnabled')} />
        </div>
        <div className="mt-7 border-t border-stone-200 pt-7">
          <h3 className="font-serif text-2xl">InstaPay</h3>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Label text="InstaPay ID">
              <Input required {...form.register('instaPayId')} />
            </Label>
            <Label text="QR payload override">
              <Input {...form.register('instaPayQrValue')} />
            </Label>
            <div className="md:col-span-2">
              <Label text="Payment instructions">
                <textarea
                  className={textareaClass}
                  required
                  {...form.register('instaPayInstructions')}
                />
              </Label>
            </div>
          </div>
        </div>
        <Button className="mt-7" disabled={update.isPending} type="submit">
          {update.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </form>
    </Section>
  );
}

function resetSettings(reset: (values: SettingsFormValues) => void, settings: WebsiteSettings) {
  reset({
    storeName: settings.storeName,
    tagline: settings.tagline,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone ?? '',
    storeAddress: settings.storeAddress ?? '',
    businessHours: settings.businessHours,
    announcementText: settings.announcementText ?? '',
    announcementEnabled: settings.announcementEnabled,
    cashOnDeliveryEnabled: settings.cashOnDeliveryEnabled,
    instaPayEnabled: settings.instaPayEnabled,
    instaPayId: settings.instaPayId,
    instaPayQrValue: settings.instaPayQrValue ?? '',
    instaPayInstructions: settings.instaPayInstructions,
  });
}

function SocialLinksEditor() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: socialKey, queryFn: listSocialLinks, retry: false });
  const [editing, setEditing] = useState<'new' | SocialLink | null>(null);
  const save = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SocialLinkWriteInput }) =>
      id ? updateSocialLink(id, input) : createSocialLink(input),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: socialKey });
    },
  });
  const remove = useMutation({
    mutationFn: deleteSocialLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: socialKey }),
  });
  return (
    <Section
      title="Social links"
      action={<Button onClick={() => setEditing('new')}>Add link</Button>}
    >
      {editing ? (
        <SocialEditor
          error={save.error}
          link={editing === 'new' ? null : editing}
          pending={save.isPending}
          onCancel={() => setEditing(null)}
          onSave={(input) => save.mutate({ id: editing === 'new' ? undefined : editing.id, input })}
        />
      ) : null}
      <QueryState query={query} loading="Loading social links…" />
      {query.data ? (
        <div className="divide-y divide-stone-200">
          {query.data.map((link) => (
            <div className="flex flex-wrap items-center justify-between gap-4 py-4" key={link.id}>
              <div>
                <p className="font-medium">{link.label}</p>
                <p className="mt-1 break-all text-xs text-stone-500">{link.url}</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span>{link.isActive ? 'Active' : 'Hidden'}</span>
                <button className="underline" onClick={() => setEditing(link)}>
                  Edit
                </button>
                <button
                  className="underline"
                  onClick={() =>
                    window.confirm('Delete this social link?') && remove.mutate(link.id)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

function SocialEditor({
  link,
  pending,
  error,
  onCancel,
  onSave,
}: {
  link: SocialLink | null;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: (input: SocialLinkWriteInput) => void;
}) {
  const [platform, setPlatform] = useState(link?.platform ?? 'instagram');
  const [label, setLabel] = useState(link?.label ?? 'Instagram');
  const [url, setUrl] = useState(link?.url ?? 'https://');
  const [position, setPosition] = useState(String(link?.position ?? 0));
  const [active, setActive] = useState(link?.isActive ?? true);
  return (
    <form
      className="mb-7 bg-stone-50 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ platform, label, url, position: Number(position), isActive: active });
      }}
    >
      {error ? <StatusMessage tone="error">{errorMessage(error)}</StatusMessage> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Label text="Platform">
          <Input
            required
            value={platform}
            onChange={(event) => setPlatform(event.target.value.toLowerCase())}
          />
        </Label>
        <Label text="Label">
          <Input required value={label} onChange={(event) => setLabel(event.target.value)} />
        </Label>
        <Label text="HTTPS URL">
          <Input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} />
        </Label>
        <Label text="Position">
          <Input
            min="0"
            type="number"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
          />
        </Label>
      </div>
      <label className="mt-4 flex gap-2 text-sm">
        <input
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          type="checkbox"
        />{' '}
        Visible publicly
      </label>
      <div className="mt-5 flex gap-3">
        <Button disabled={pending} type="submit">
          Save link
        </Button>
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function BannersEditor() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: bannersKey, queryFn: listHomepageBanners, retry: false });
  const [editing, setEditing] = useState<'new' | HomepageBanner | null>(null);
  const save = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: HomepageBannerWriteInput }) =>
      id ? updateHomepageBanner(id, input) : createHomepageBanner(input),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: bannersKey });
    },
  });
  const remove = useMutation({
    mutationFn: deleteHomepageBanner,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bannersKey }),
  });
  return (
    <Section
      title="Homepage banners"
      action={<Button onClick={() => setEditing('new')}>New banner</Button>}
    >
      {editing ? (
        <BannerEditor
          banner={editing === 'new' ? null : editing}
          error={save.error}
          pending={save.isPending}
          onCancel={() => setEditing(null)}
          onSave={(input) => save.mutate({ id: editing === 'new' ? undefined : editing.id, input })}
        />
      ) : null}
      <QueryState query={query} loading="Loading homepage banners…" />
      {query.data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {query.data.map((banner) => (
            <article className="border border-stone-200 p-5" key={banner.id}>
              <p className="text-[10px] tracking-wider text-stone-500 uppercase">
                {banner.isActive ? 'Active' : 'Hidden'} · Position {banner.position}
              </p>
              <h3 className="mt-3 font-serif text-2xl">{banner.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs text-stone-500">{banner.imageUrl}</p>
              <div className="mt-5 flex gap-4 text-xs">
                <button className="underline" onClick={() => setEditing(banner)}>
                  Edit
                </button>
                <button
                  className="underline"
                  onClick={() =>
                    window.confirm('Delete this homepage banner and its managed image?') &&
                    remove.mutate(banner.id)
                  }
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

function BannerEditor({
  banner,
  pending,
  error,
  onCancel,
  onSave,
}: {
  banner: HomepageBanner | null;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: (input: HomepageBannerWriteInput) => void;
}) {
  const [value, setValue] = useState<HomepageBannerWriteInput>({
    eyebrow: banner?.eyebrow ?? '',
    title: banner?.title ?? '',
    description: banner?.description ?? '',
    imageUrl: banner?.imageUrl ?? '',
    imagePublicId: banner?.imagePublicId ?? '',
    altText: banner?.altText ?? '',
    ctaLabel: banner?.ctaLabel ?? 'Shop now',
    ctaUrl: banner?.ctaUrl ?? '/products',
    position: banner?.position ?? 0,
    isActive: banner?.isActive ?? true,
    startsAt: toLocalDateTime(banner?.startsAt),
    endsAt: toLocalDateTime(banner?.endsAt),
  });
  const upload = useMutation({
    mutationFn: uploadHomepageBannerImage,
    onSuccess: (image) =>
      setValue((current) => ({
        ...current,
        imageUrl: image.secureUrl,
        imagePublicId: image.publicId,
      })),
  });
  const set = <K extends keyof HomepageBannerWriteInput>(
    key: K,
    next: HomepageBannerWriteInput[K],
  ) => setValue((current) => ({ ...current, [key]: next }));
  return (
    <form
      className="mb-7 bg-stone-50 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          ...value,
          eyebrow: value.eyebrow || null,
          description: value.description || null,
          imagePublicId: value.imagePublicId || null,
          startsAt: fromLocalDateTime(value.startsAt),
          endsAt: fromLocalDateTime(value.endsAt),
        });
      }}
    >
      {error || upload.error ? (
        <StatusMessage tone="error">{errorMessage(error ?? upload.error)}</StatusMessage>
      ) : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Label text="Eyebrow">
          <Input
            value={value.eyebrow ?? ''}
            onChange={(event) => set('eyebrow', event.target.value)}
          />
        </Label>
        <Label text="Title">
          <Input
            required
            value={value.title}
            onChange={(event) => set('title', event.target.value)}
          />
        </Label>
        <Label text="Description">
          <Input
            value={value.description ?? ''}
            onChange={(event) => set('description', event.target.value)}
          />
        </Label>
        <Label text="Alternative text">
          <Input
            required
            value={value.altText}
            onChange={(event) => set('altText', event.target.value)}
          />
        </Label>
        <Label text="Image URL">
          <Input
            required
            value={value.imageUrl}
            onChange={(event) => set('imageUrl', event.target.value)}
          />
        </Label>
        <Label text="Upload image">
          <Input
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={upload.isPending}
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
            }}
          />
        </Label>
        <Label text="CTA label">
          <Input
            required
            value={value.ctaLabel}
            onChange={(event) => set('ctaLabel', event.target.value)}
          />
        </Label>
        <Label text="CTA URL">
          <Input
            required
            value={value.ctaUrl}
            onChange={(event) => set('ctaUrl', event.target.value)}
          />
        </Label>
        <Label text="Starts at">
          <Input
            type="datetime-local"
            value={value.startsAt ?? ''}
            onChange={(event) => set('startsAt', event.target.value)}
          />
        </Label>
        <Label text="Ends at">
          <Input
            type="datetime-local"
            value={value.endsAt ?? ''}
            onChange={(event) => set('endsAt', event.target.value)}
          />
        </Label>
        <Label text="Position">
          <Input
            min="0"
            type="number"
            value={value.position}
            onChange={(event) => set('position', Number(event.target.value))}
          />
        </Label>
      </div>
      <label className="mt-4 flex gap-2 text-sm">
        <input
          checked={value.isActive}
          onChange={(event) => set('isActive', event.target.checked)}
          type="checkbox"
        />{' '}
        Banner is active
      </label>
      <div className="mt-5 flex gap-3">
        <Button disabled={pending || upload.isPending} type="submit">
          Save banner
        </Button>
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-stone-200 bg-white p-6 sm:p-8">
      <div className="mb-7 flex items-center justify-between gap-4">
        <h2 className="font-serif text-3xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-stone-600">
      {text}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Checkbox({
  label,
  registration,
}: {
  label: string;
  registration: ReturnType<ReturnType<typeof useForm<SettingsFormValues>>['register']>;
}) {
  return (
    <label className="flex gap-2 text-sm">
      <input type="checkbox" {...registration} /> {label}
    </label>
  );
}

function QueryState({
  query,
  loading,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown };
  loading: string;
}) {
  if (query.isPending) return <StatusMessage>{loading}</StatusMessage>;
  if (query.isError) return <StatusMessage tone="error">{errorMessage(query.error)}</StatusMessage>;
  return null;
}

function toLocalDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDateTime(value?: string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

const textareaClass =
  'min-h-28 w-full border border-stone-300 bg-white p-3 text-base outline-none focus:border-stone-950';
