'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useMemo, useRef, useState } from 'react';

import { formatEgp } from '@/lib/format/currency';
import type { Product } from '@/types/catalog';

import { ArrowIcon } from './icons';
import styles from './fashion-hero.module.css';

type RailStyle = CSSProperties & {
  '--neighbor-shift': string;
  '--neighbor-scale': string;
  '--neighbor-opacity': string;
  '--swing-delay': string;
  '--swing-duration': string;
};

type CampaignStyle = CSSProperties & {
  '--campaign-color': string;
};

interface FashionHeroProps {
  products: Product[];
  storeName: string;
  announcement: string;
  unavailable?: boolean;
}

export function FashionHero({
  products,
  storeName,
  announcement,
  unavailable = false,
}: FashionHeroProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ pointerId: -1, startX: 0, scrollLeft: 0, moved: false });
  const selectedProduct = products[selectedIndex] ?? products[0];
  const focusIndex = hoveredIndex ?? selectedIndex;
  const activeProduct = products[focusIndex] ?? selectedProduct;
  const campaignColor =
    activeProduct?.variants.find((variant) => variant.isActive && variant.colorHex)?.colorHex ??
    activeProduct?.variants.find((variant) => variant.colorHex)?.colorHex ??
    '#ff4a1f';
  const campaignStyle: CampaignStyle = { '--campaign-color': campaignColor };

  const tickerItems = useMemo(
    () => [announcement, 'New season edit', 'Delivery across Egypt', storeName],
    [announcement, storeName],
  );

  function selectProduct(index: number) {
    if (dragRef.current.moved) return;
    setSelectedIndex(index);
    setHoveredIndex(index);
    scrollProductIntoView(index);
  }

  function scrollProductIntoView(index: number) {
    const rail = railRef.current;
    const item = rail?.querySelector<HTMLElement>(`[data-rail-index="${index}"]`);
    if (!rail || !item) return;
    const left = item.offsetLeft - (rail.clientWidth - item.offsetWidth) / 2;
    rail.scrollTo({
      left,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  function moveSelection(direction: -1 | 1) {
    if (!products.length) return;
    const nextIndex = Math.min(products.length - 1, Math.max(0, selectedIndex + direction));
    setSelectedIndex(nextIndex);
    setHoveredIndex(null);
    scrollProductIntoView(nextIndex);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !railRef.current) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: railRef.current.scrollLeft,
      moved: false,
    };
    railRef.current.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail || dragRef.current.pointerId !== event.pointerId) return;
    const distance = event.clientX - dragRef.current.startX;
    if (Math.abs(distance) > 5) dragRef.current.moved = true;
    rail.scrollLeft = dragRef.current.scrollLeft - distance;
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail || dragRef.current.pointerId !== event.pointerId) return;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    dragRef.current.pointerId = -1;
    setDragging(false);
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 0);
  }

  return (
    <section
      className={styles.campaign}
      style={campaignStyle}
      aria-labelledby="fashion-hero-title"
    >
      <span className={`${styles.orbit} ${styles.orbitOne}`} aria-hidden="true" />
      <span className={`${styles.orbit} ${styles.orbitTwo}`} aria-hidden="true" />

      <div className={styles.storefront}>
        <div className={styles.topline}>
          {/* <p>Curated essentials · Cairo</p>
          <nav aria-label="Featured collection">
            <Link href="/products?newArrival=true">New arrivals</Link>
            <Link href="/categories">Collections</Link>
            <Link href="/about">Our story</Link>
          </nav>
          <p className={styles.edition}>Edition 01</p> */}
        </div>

        {products.length ? (
          <>
            <div className={styles.rackShell}>
              <div className={styles.rackControls}>
                <button
                  type="button"
                  onClick={() => moveSelection(-1)}
                  disabled={selectedIndex === 0}
                  aria-label="Previous garment"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <p>Drag or swipe the rail</p>
                <button
                  type="button"
                  onClick={() => moveSelection(1)}
                  disabled={selectedIndex === products.length - 1}
                  aria-label="Next garment"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <div
                ref={railRef}
                className={`${styles.railViewport} ${dragging ? styles.dragging : ''}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                onPointerLeave={(event) => {
                  if (dragging) finishDrag(event);
                }}
              >
                <div className={styles.railContent}>
                  <div className={styles.metalRail} aria-hidden="true" />
                  <span
                    className={`${styles.railStop} ${styles.railStopLeft}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`${styles.railStop} ${styles.railStopRight}`}
                    aria-hidden="true"
                  />

                  {products.map((product, index) => {
                    const frontImage =
                      product.images.find((candidate) => candidate.isPrimary) ?? product.images[0];
                    const sideImage = product.images.find(
                      (candidate) => candidate.id !== frontImage?.id,
                    );
                    const distance = index - focusIndex;
                    const absoluteDistance = Math.abs(distance);
                    const itemStyle: RailStyle = {
                      '--neighbor-shift': '0px',
                      '--neighbor-scale':
                        distance === 0 ? '1' : absoluteDistance === 1 ? '0.9' : '0.94',
                      '--neighbor-opacity':
                        distance === 0 ? '1' : absoluteDistance === 1 ? '0.58' : '0.72',
                      '--swing-delay': `${index * -0.37}s`,
                      '--swing-duration': `${4.4 + (index % 3) * 0.55}s`,
                    };

                    return (
                      <button
                        key={product.id}
                        type="button"
                        data-rail-index={index}
                        data-has-side-view={Boolean(sideImage)}
                        data-selected={index === selectedIndex}
                        data-active={index === focusIndex}
                        data-hovered={index === hoveredIndex}
                        className={styles.garmentItem}
                        style={itemStyle}
                        aria-pressed={index === selectedIndex}
                        aria-label={`Select ${product.name}`}
                        onClick={() => selectProduct(index)}
                        onMouseEnter={() => {
                          setHoveredIndex(index);
                        }}
                        onFocus={() => {
                          setHoveredIndex(index);
                        }}
                      >
                        <span className={styles.swingAssembly}>
                          {/* <ClothingHanger /> */}
                          <span
                            className={styles.garmentMedia}
                            data-image={Boolean(frontImage)}
                            data-has-side-view={Boolean(sideImage)}
                          >
                            {frontImage && sideImage ? (
                              <>
                                <Image
                                  src={sideImage.secureUrl}
                                  alt=""
                                  fill
                                  priority={index < 5}
                                  draggable={false}
                                  sizes="(max-width: 640px) 42vw, (max-width: 1024px) 24vw, 14vw"
                                  className={`${styles.productImage} ${styles.sideImage}`}
                                  data-product-view="side"
                                />
                                <Image
                                  src={frontImage.secureUrl}
                                  alt=""
                                  fill
                                  priority={index < 5}
                                  draggable={false}
                                  sizes="(max-width: 640px) 42vw, (max-width: 1024px) 24vw, 14vw"
                                  className={`${styles.productImage} ${styles.frontImage}`}
                                  data-product-view="front"
                                />
                              </>
                            ) : frontImage ? (
                              <Image
                                src={frontImage.secureUrl}
                                alt=""
                                fill
                                priority={index < 5}
                                draggable={false}
                                sizes="(max-width: 640px) 42vw, (max-width: 1024px) 24vw, 14vw"
                                className={`${styles.productImage} ${styles.staticImage}`}
                                data-product-view="front"
                              />
                            ) : (
                              <span className={styles.missingGarment} aria-hidden="true">
                                <span />
                              </span>
                            )}
                          </span>
                        </span>
                        <span className={styles.itemNumber}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {activeProduct ? (
              <div className={styles.productDetails} aria-live="polite">
                <p className={styles.productMeta}>
                  {activeProduct.brand.name} · {activeProduct.category.name}
                </p>
                <h1 id="fashion-hero-title">{activeProduct.name}</h1>
                <div className={styles.priceLine}>
                  <p>
                    {formatEgp(activeProduct.salePricePiasters ?? activeProduct.pricePiasters)}
                  </p>
                  {activeProduct.salePricePiasters ? (
                    <del>{formatEgp(activeProduct.pricePiasters)}</del>
                  ) : null}
                  <span
                    className={
                      activeProduct.stockQuantity > 0 ? styles.inStock : styles.outOfStock
                    }
                  >
                    {activeProduct.stockQuantity > 0 ? 'Available' : 'Out of stock'}
                  </span>
                </div>
                <Link href={`/products/${activeProduct.slug}`} className={styles.exploreButton}>
                  Explore product <ArrowIcon className="size-4" />
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.emptyState}>
            <p>
              {unavailable
                ? 'The collection is temporarily unavailable.'
                : 'The next collection is being prepared.'}
            </p>
            <h1 id="fashion-hero-title">A quieter way to discover what is next.</h1>
            <Link href="/products" className={styles.exploreButton}>
              Browse the collection <ArrowIcon className="size-4" />
            </Link>
          </div>
        )}

        <div className={styles.ticker} aria-label={announcement}>
          <div className={styles.tickerTrack}>
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <span key={`${item}-${index}`}>
                {item}
                <i aria-hidden="true">✦</i>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClothingHanger() {
  return (
    <svg className={styles.hanger} viewBox="0 0 180 92" aria-hidden="true">
      <path d="M88 34c0-8 13-7 13-17 0-8-7-13-14-10-4 2-6 5-6 9" />
      <path d="M91 32 12 77c-8 5-5 10 3 10h150c8 0 11-5 3-10L91 32Z" />
      <path d="M27 80h126" />
    </svg>
  );
}
