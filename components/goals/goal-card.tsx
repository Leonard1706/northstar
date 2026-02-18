'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressRing } from '@/components/ui/progress-ring';
import { cn } from '@/lib/utils';
import type { Goal, PeriodType } from '@/types';

interface GoalCardProps {
  goal: Goal;
  showProgress?: boolean;
  showLink?: boolean;
  compact?: boolean;
  className?: string;
}

const periodColors: Record<PeriodType, string> = {
  vision: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  yearly: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  quarterly: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  monthly: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  weekly: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export function GoalCard({
  goal,
  showProgress = true,
  showLink = true,
  compact = false,
  className,
}: GoalCardProps) {
  const completedTasks = goal.tasks.filter((t) => t.completed).length;
  const totalTasks = goal.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const cardContent = (
    <Card
      className={cn(
        'group transition-all duration-200',
        showLink && 'cursor-pointer hover:shadow-md hover:border-primary/20',
        className
      )}
    >
      <CardHeader className={cn('flex flex-row items-start justify-between gap-4', compact && 'pb-2')}>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn('text-xs', periodColors[goal.frontmatter.period])}>
              {goal.frontmatter.period}
            </Badge>
            {goal.frontmatter.status === 'completed' && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
          <CardTitle className={cn('line-clamp-2', compact ? 'text-base' : 'text-lg')}>
            {goal.title}
          </CardTitle>
        </div>

        {showProgress && (
          <div className="flex items-center gap-3">
            <ProgressRing progress={progress} size={compact ? 36 : 44} />
            {showLink && (
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </div>
        )}
      </CardHeader>

      {!compact && totalTasks > 0 && (
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {completedTasks} of {totalTasks} tasks
            </span>
          </div>

          {/* Show first few tasks */}
          <div className="mt-3 space-y-1.5">
            {goal.tasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                {task.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                )}
                <span className={cn('line-clamp-1', task.completed && 'text-muted-foreground line-through')}>
                  {task.text}
                </span>
              </div>
            ))}
            {goal.tasks.length > 3 && (
              <p className="text-xs text-muted-foreground pl-5">
                +{goal.tasks.length - 3} more tasks
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {showLink ? (
        <Link href={`/goals/${goal.path}`}>{cardContent}</Link>
      ) : (
        cardContent
      )}
    </motion.div>
  );
}
