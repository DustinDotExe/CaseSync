import type { SVGProps } from 'react';
import { cn } from '../lib/utils';

export default function CasePlanrLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={cn('shrink-0 text-accent-600 dark:text-accent-500', className)}
      aria-hidden="true"
      {...props}
    >
      <circle cx="100" cy="100" r="96" fill="currentColor" />
      <g transform="translate(30, 64) scale(3)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2a2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
      </g>
      <g transform="translate(98, 64) scale(3)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
      </g>
      <g transform="translate(64, 64) scale(3)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1" />
        <path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1" />
        <path d="M7 21h10" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
      </g>
    </svg>
  );
}
