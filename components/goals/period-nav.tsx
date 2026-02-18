'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronUp, Sparkles, Target, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PeriodType, Goal } from '@/types';

interface PeriodNavProps {
  goals: {
    vision?: Goal | null;
    yearly?: Goal | null;
    quarterly?: Goal | null;
    monthly?: Goal | null;
    weekly?: Goal | null;
  };
  currentPeriod?: PeriodType;
}

const periodConfig: Record<PeriodType, { icon: React.ElementType; label: string; color: string }> = {
  vision: { icon: Sparkles, label: 'Vision', color: 'text-purple-500' },
  yearly: { icon: Target, label: 'Year', color: 'text-blue-500' },
  quarterly: { icon: Calendar, label: 'Quarter', color: 'text-cyan-500' },
  monthly: { icon: Calendar, label: 'Month', color: 'text-emerald-500' },
  weekly: { icon: Calendar, label: 'Week', color: 'text-amber-500' },
};

export function PeriodNav({ goals, currentPeriod }: PeriodNavProps) {
  const periods: PeriodType[] = ['vision', 'yearly', 'quarterly', 'monthly', 'weekly'];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {periods.map((period, index) => {
        const goal = goals[period as keyof typeof goals];
        const config = periodConfig[period];
        const Icon = config.icon;
        const isActive = currentPeriod === period;
        const hasPrevious = index > 0;

        return (
          <div key={period} className="flex items-center">
            {hasPrevious && (
              <ChevronUp className="h-4 w-4 text-muted-foreground/30 -rotate-90 mx-1" />
            )}
            <Link href={goal ? `/goals/${goal.path}` : '#'}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 transition-all',
                    isActive && 'border-primary shadow-sm',
                    !goal && 'opacity-50 pointer-events-none'
                  )}
                >
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{config.label}</span>
                    <span className="text-sm font-medium whitespace-nowrap">
                      {goal?.title || 'Not set'}
                    </span>
                  </div>
                  {isActive && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Current
                    </Badge>
                  )}
                </Card>
              </motion.div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
