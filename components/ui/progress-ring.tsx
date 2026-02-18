'use client';

import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
}

export function ProgressRing({
  progress,
  size = 40,
  strokeWidth = 3,
  className,
  showValue = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  // Get color based on progress
  const getProgressColor = (value: number) => {
    if (value === 0) return 'var(--progress-0)';
    if (value <= 25) return 'var(--progress-25)';
    if (value <= 50) return 'var(--progress-50)';
    if (value <= 75) return 'var(--progress-75)';
    return 'var(--progress-100)';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getProgressColor(progress)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showValue && (
        <span className="absolute text-xs font-medium">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}
