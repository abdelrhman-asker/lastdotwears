import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.5,
  viewBox: '0 0 24 24',
};

export function SearchIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...common} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...common} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.7-3.6 3-5.5 6.5-5.5s5.8 1.9 6.5 5.5" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...common} {...props}>
      <path d="M4 8h16M4 16h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...common} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...common} {...props}>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

export function HeartIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg aria-hidden="true" {...common} fill={filled ? 'currentColor' : 'none'} {...props}>
      <path d="M20.8 5.8c-2-2.2-5.4-2.3-7.5-.2L12 6.9l-1.3-1.3a5.2 5.2 0 0 0-7.5.2c-1.8 2.2-1.5 5.4.5 7.4L12 21l8.3-7.8c2-2 2.3-5.2.5-7.4Z" />
    </svg>
  );
}

export function BagIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" {...common} {...props}>
      <path d="M5 8.5h14l-1 12H6l-1-12Z" />
      <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}
