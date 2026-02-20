'use client';

import { cn } from '@/lib/utils';

export function StreamingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-gentle-pulse" />
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-gentle-pulse animate-delay-200" />
      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-gentle-pulse animate-delay-400" />
    </div>
  );
}
