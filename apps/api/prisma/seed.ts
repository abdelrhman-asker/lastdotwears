import 'dotenv/config';

import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';

import { PrismaClient } from '../src/generated/prisma/client.js';

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

const seedEnvironmentSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//),
  SEED_ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
  SEED_ADMIN_PASSWORD: z.string().min(12).max(128).regex(strongPasswordPattern),
  SEED_CUSTOMER_EMAIL: z.email().transform((value) => value.toLowerCase()),
  SEED_CUSTOMER_PASSWORD: z.string().min(12).max(128).regex(strongPasswordPattern),
  MAIL_FROM_NAME: z.string().trim().min(2).default('Last-Dot Wears'),
  MAIL_FROM_EMAIL: z.email().default('support@last-dot.com'),
  INSTAPAY_ID: z.string().trim().min(3).default('abdelrhman_asker@instapay'),
  INSTAPAY_QR_VALUE: z.string().trim().optional(),
  INSTAPAY_INSTRUCTIONS: z
    .string()
    .trim()
    .min(10)
    .default(
      'Transfer the exact order total, include your order number, then wait for confirmation.',
    ),
});

const environment = seedEnvironmentSchema.parse(process.env);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: environment.DATABASE_URL }),
});

const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

const sampleAddressId = '2c41d7fe-8941-4fd0-9ca4-9dc224c4d6a1';
const sampleBannerId = '69d21843-e917-4e38-ab3c-6f91bbd7b80b';

const socialLinks = [
  ['instagram', 'Instagram', 'https://www.instagram.com/lastdot_wears?'],
  // ['facebook', 'Facebook', 'https://www.facebook.com/'],
  ['tiktok', 'TikTok', 'https://www.tiktok.com/@lastdot_wears'],
] as const;

const shippingRates = [
  ['cairo', 'Cairo', 6000, 1, 3],
  ['giza', 'Giza', 6000, 1, 3],
  ['alexandria', 'Alexandria', 7000, 2, 4],
  ['dakahlia', 'Dakahlia', 7500, 2, 5],
  ['red-sea', 'Red Sea', 10000, 4, 7],
  ['beheira', 'Beheira', 7500, 2, 5],
  ['fayoum', 'Fayoum', 8000, 3, 5],
  ['gharbia', 'Gharbia', 7500, 2, 5],
  ['ismailia', 'Ismailia', 7500, 2, 4],
  ['monufia', 'Monufia', 7500, 2, 5],
  ['minya', 'Minya', 9000, 3, 6],
  ['qalyubia', 'Qalyubia', 6500, 1, 4],
  ['new-valley', 'New Valley', 11000, 5, 8],
  ['suez', 'Suez', 7500, 2, 4],
  ['aswan', 'Aswan', 10000, 4, 7],
  ['assiut', 'Assiut', 9000, 3, 6],
  ['beni-suef', 'Beni Suef', 8500, 3, 5],
  ['port-said', 'Port Said', 8000, 2, 5],
  ['damietta', 'Damietta', 8000, 2, 5],
  ['sharqia', 'Sharqia', 7500, 2, 5],
  ['south-sinai', 'South Sinai', 11000, 5, 8],
  ['kafr-el-sheikh', 'Kafr El Sheikh', 8000, 2, 5],
  ['matrouh', 'Matrouh', 11000, 4, 8],
  ['luxor', 'Luxor', 10000, 4, 7],
  ['qena', 'Qena', 9500, 4, 7],
  ['north-sinai', 'North Sinai', 11000, 5, 8],
  ['sohag', 'Sohag', 9500, 4, 7],
] as const;

const catalogProducts = [
  {
    name: 'Relaxed Cotton Shirt',
    slug: 'relaxed-cotton-shirt',
    description:
      'A relaxed long-sleeve shirt cut from breathable cotton with a clean concealed placket.',
    pricePiasters: 159_900,
    salePricePiasters: 129_900,
    categorySlug: 'men',
    brandSlug: 'cairo-essentials',
    isFeatured: true,
    isNewArrival: false,
    variants: [
      ['RCS-BLK-S', 'S', 'Black', '#111111', 14],
      ['RCS-BLK-M', 'M', 'Black', '#111111', 20],
      ['RCS-WHT-M', 'M', 'White', '#F5F5F0', 12],
      ['RCS-WHT-L', 'L', 'White', '#F5F5F0', 9],
    ],
  },
  {
    name: 'Wide Leg Trousers',
    slug: 'wide-leg-trousers',
    description:
      'Fluid high-rise trousers with a wide leg, discreet side pockets, and a softly tailored finish.',
    pricePiasters: 189_900,
    salePricePiasters: null,
    categorySlug: 'women',
    brandSlug: 'nile-studio',
    isFeatured: true,
    isNewArrival: true,
    variants: [
      ['WLT-STN-36', '36', 'Stone', '#C8BFAF', 8],
      ['WLT-STN-38', '38', 'Stone', '#C8BFAF', 15],
      ['WLT-NVY-38', '38', 'Navy', '#182235', 11],
      ['WLT-NVY-40', '40', 'Navy', '#182235', 7],
    ],
  },
  {
    name: 'Ribbed Knit Top',
    slug: 'ribbed-knit-top',
    description:
      'A close-fitting ribbed top with a refined neckline, made for effortless layering.',
    pricePiasters: 109_900,
    salePricePiasters: null,
    categorySlug: 'women',
    brandSlug: 'cairo-essentials',
    isFeatured: false,
    isNewArrival: true,
    variants: [
      ['RKT-ECR-S', 'S', 'Ecru', '#E8E0D1', 17],
      ['RKT-ECR-M', 'M', 'Ecru', '#E8E0D1', 16],
      ['RKT-CHO-M', 'M', 'Chocolate', '#4B3028', 10],
      ['RKT-CHO-L', 'L', 'Chocolate', '#4B3028', 6],
    ],
  },
  {
    name: 'Linen Blend Overshirt',
    slug: 'linen-blend-overshirt',
    description:
      'A lightweight linen-blend overshirt with patch pockets and an easy, structured silhouette.',
    pricePiasters: 219_900,
    salePricePiasters: null,
    categorySlug: 'men',
    brandSlug: 'nile-studio',
    isFeatured: false,
    isNewArrival: true,
    variants: [
      ['LBO-OLV-M', 'M', 'Olive', '#62634C', 13],
      ['LBO-OLV-L', 'L', 'Olive', '#62634C', 10],
      ['LBO-SND-L', 'L', 'Sand', '#C9B99D', 8],
      ['LBO-SND-XL', 'XL', 'Sand', '#C9B99D', 5],
    ],
  },
  {
    name: 'Structured Everyday Tote',
    slug: 'structured-everyday-tote',
    description:
      'A spacious structured tote with clean handles and an internal pocket for daily essentials.',
    pricePiasters: 149_900,
    salePricePiasters: null,
    categorySlug: 'accessories',
    brandSlug: 'nile-studio',
    isFeatured: true,
    isNewArrival: true,
    variants: [
      ['SET-BLK-OS', 'One Size', 'Black', '#111111', 18],
      ['SET-TAN-OS', 'One Size', 'Tan', '#A8754F', 12],
    ],
  },
] as const;

function combinationKey(size: string, color: string): string {
  return `${size.trim().toLowerCase()}::${color.trim().toLowerCase()}`;
}

async function seed(): Promise<void> {
  const [adminPasswordHash, customerPasswordHash] = await Promise.all([
    argon2.hash(environment.SEED_ADMIN_PASSWORD, passwordOptions),
    argon2.hash(environment.SEED_CUSTOMER_PASSWORD, passwordOptions),
  ]);
  const verifiedAt = new Date();

  const admin = await prisma.user.upsert({
    where: { email: environment.SEED_ADMIN_EMAIL },
    update: {
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      emailVerifiedAt: verifiedAt,
    },
    create: {
      email: environment.SEED_ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      firstName: 'Store',
      lastName: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      emailVerifiedAt: verifiedAt,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: environment.SEED_CUSTOMER_EMAIL },
    update: {
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isEmailVerified: true,
      emailVerifiedAt: verifiedAt,
    },
    create: {
      email: environment.SEED_CUSTOMER_EMAIL,
      passwordHash: customerPasswordHash,
      firstName: 'Sample',
      lastName: 'Customer',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isEmailVerified: true,
      emailVerifiedAt: verifiedAt,
    },
  });

  const customerDefaultAddress = await prisma.address.findFirst({
    where: { userId: customer.id, isDefault: true },
    select: { id: true },
  });
  await prisma.address.upsert({
    where: { id: sampleAddressId },
    update: {},
    create: {
      id: sampleAddressId,
      userId: customer.id,
      label: 'Home',
      recipientFirstName: customer.firstName,
      recipientLastName: customer.lastName,
      phone: '01012345678',
      governorateCode: 'cairo',
      governorateName: 'Cairo',
      city: 'Nasr City',
      addressLine1: '12 Example Street',
      addressLine2: 'Apartment 4',
      postalCode: '11765',
      deliveryNotes: 'Please call before arrival.',
      isDefault: !customerDefaultAddress,
    },
  });

  const categories = await Promise.all(
    [
      { name: 'Women', slug: 'women', position: 10 },
      { name: 'Men', slug: 'men', position: 20 },
      { name: 'Accessories', slug: 'accessories', position: 30 },
    ].map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          position: category.position,
          isActive: true,
          deletedAt: null,
        },
        create: category,
      }),
    ),
  );
  const brands = await Promise.all(
    [
      { name: 'Nile Studio', slug: 'nile-studio' },
      { name: 'Cairo Essentials', slug: 'cairo-essentials' },
    ].map((brand) =>
      prisma.brand.upsert({
        where: { slug: brand.slug },
        update: { name: brand.name, isActive: true, deletedAt: null },
        create: brand,
      }),
    ),
  );
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));

  for (const sample of catalogProducts) {
    const category = categoryBySlug.get(sample.categorySlug);
    const brand = brandBySlug.get(sample.brandSlug);
    if (!category || !brand) throw new Error(`Missing catalog reference for ${sample.slug}.`);

    const product = await prisma.product.upsert({
      where: { slug: sample.slug },
      update: {
        name: sample.name,
        description: sample.description,
        pricePiasters: sample.pricePiasters,
        salePricePiasters: sample.salePricePiasters,
        sortPricePiasters: sample.salePricePiasters ?? sample.pricePiasters,
        categoryId: category.id,
        brandId: brand.id,
        status: 'ACTIVE',
        isFeatured: sample.isFeatured,
        isNewArrival: sample.isNewArrival,
        deletedAt: null,
      },
      create: {
        name: sample.name,
        slug: sample.slug,
        description: sample.description,
        pricePiasters: sample.pricePiasters,
        salePricePiasters: sample.salePricePiasters,
        sortPricePiasters: sample.salePricePiasters ?? sample.pricePiasters,
        categoryId: category.id,
        brandId: brand.id,
        status: 'ACTIVE',
        isFeatured: sample.isFeatured,
        isNewArrival: sample.isNewArrival,
      },
    });

    for (const [sku, size, colorName, colorHex, stockQuantity] of sample.variants) {
      await prisma.productVariant.upsert({
        where: { sku },
        update: {
          productId: product.id,
          size,
          colorName,
          colorHex,
          combinationKey: combinationKey(size, colorName),
          isActive: true,
          deletedAt: null,
        },
        create: {
          productId: product.id,
          sku,
          size,
          colorName,
          colorHex,
          combinationKey: combinationKey(size, colorName),
          stockQuantity,
          lowStockThreshold: 5,
          inventoryMovements: {
            create: {
              actorId: admin.id,
              type: 'INITIAL',
              quantityDelta: stockQuantity,
              quantityAfter: stockQuantity,
              reason: 'Initial sample catalog inventory',
            },
          },
        },
      });
    }
  }

  for (const [
    governorateCode,
    governorateName,
    feePiasters,
    estimatedMinDays,
    estimatedMaxDays,
  ] of shippingRates) {
    await prisma.shippingRate.upsert({
      where: { governorateCode },
      update: {
        governorateName,
        feePiasters,
        estimatedMinDays,
        estimatedMaxDays,
        isActive: true,
      },
      create: {
        governorateCode,
        governorateName,
        feePiasters,
        estimatedMinDays,
        estimatedMaxDays,
      },
    });
  }

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {
      description: '10% off a first qualifying order.',
      discountType: 'PERCENTAGE',
      value: 10,
      minimumSubtotalPiasters: 100_000,
      maximumDiscountPiasters: 50_000,
      usageLimit: 10_000,
      perCustomerLimit: 1,
      isActive: true,
    },
    create: {
      code: 'WELCOME10',
      description: '10% off a first qualifying order.',
      discountType: 'PERCENTAGE',
      value: 10,
      minimumSubtotalPiasters: 100_000,
      maximumDiscountPiasters: 50_000,
      usageLimit: 10_000,
      perCustomerLimit: 1,
      isActive: true,
    },
  });

  await prisma.websiteSettings.upsert({
    where: { id: 'store' },
    update: {},
    create: {
      id: 'store',
      storeName: environment.MAIL_FROM_NAME,
      tagline: 'Modern essentials, considered for life in Egypt.',
      contactEmail: environment.MAIL_FROM_EMAIL,
      businessHours: 'Sunday-Thursday, 10:00-18:00 Cairo time',
      instaPayId: environment.INSTAPAY_ID,
      instaPayQrValue: environment.INSTAPAY_QR_VALUE || null,
      instaPayInstructions: environment.INSTAPAY_INSTRUCTIONS,
    },
  });

  for (const [platform, label, url] of socialLinks) {
    await prisma.socialLink.upsert({
      where: { platform },
      update: {
        label,
        url,
        position: socialLinks.findIndex(([key]) => key === platform),
        isActive: true,
      },
      create: {
        platform,
        label,
        url,
        position: socialLinks.findIndex(([key]) => key === platform),
      },
    });
  }

  await prisma.socialLink.updateMany({
    where: { platform: 'facebook' },
    data: { isActive: false },
  });

  await prisma.homepageBanner.upsert({
    where: { id: sampleBannerId },
    update: {},
    create: {
      id: sampleBannerId,
      eyebrow: 'The warm-weather edit · 2026',
      title: 'Quiet form. Made for Cairo.',
      description:
        'Lightweight tailoring and clean everyday layers, considered for the rhythm and warmth of the city.',
      imageUrl: '/images/editorial-hero.png',
      altText: 'Two models wearing relaxed neutral tailoring in a sunlit limestone courtyard',
      ctaLabel: 'Shop new arrivals',
      ctaUrl: '/products?newArrival=true',
      position: 0,
      isActive: true,
    },
  });

  process.stdout.write(
    `Seeded administrator ${admin.email}, customer ${customer.email} with a default address, ${catalogProducts.length} sample products, ${shippingRates.length} shipping rates, website settings, social links, a homepage banner, and WELCOME10.\n`,
  );
}

void seed()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown seed failure';
    process.stderr.write(`Database seed failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
