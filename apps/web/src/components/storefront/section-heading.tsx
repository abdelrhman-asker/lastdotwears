import Link from 'next/link';

import { ArrowIcon } from './icons';

export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel = 'View all',
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 md:mb-10">
      <div>
        {eyebrow ? (
          <p className="mb-3 text-[10px] tracking-[0.22em] text-stone-500 uppercase">{eyebrow}</p>
        ) : null}
        <h2 className="font-serif text-4xl leading-none tracking-[-0.035em] sm:text-5xl">
          {title}
        </h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="group hidden items-center gap-2 border-b border-stone-900 pb-1 text-sm sm:flex"
        >
          {linkLabel}
          <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}
