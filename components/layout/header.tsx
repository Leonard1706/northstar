'use client';

import { format } from 'date-fns';

interface HeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const today = new Date();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              typeof subtitle === 'string' ? (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              ) : (
                subtitle
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {actions}
          <div className="text-right">
            <p className="text-sm font-medium">{format(today, 'EEEE')}</p>
            <p className="text-xs text-muted-foreground">
              {format(today, 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
