'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Reflection, PeriodType } from '@/types';

interface ReflectionCardProps {
  reflection: Reflection;
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

export function ReflectionCard({
  reflection,
  showLink = true,
  compact = false,
  className,
}: ReflectionCardProps) {
  const { frontmatter, sections } = reflection;
  const completionPercent = (frontmatter.completionRate || 0) * 100;
  const formattedDate = format(new Date(frontmatter.date), 'MMMM d, yyyy');

  // Get first meaningful answer for preview
  const previewSection = sections.find((s) => s.answer && s.answer.length > 10);

  const cardContent = (
    <Card
      className={cn(
        'group transition-all duration-200',
        showLink && 'cursor-pointer hover:shadow-md hover:border-primary/20',
        className
      )}
    >
      <CardHeader className={cn('flex flex-row items-start justify-between gap-4', compact && 'pb-2')}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn('text-xs', periodColors[frontmatter.period])}>
                {frontmatter.period}
              </Badge>
              <span className="text-xs text-muted-foreground">{formattedDate}</span>
            </div>
            <CardTitle className={cn('line-clamp-1', compact ? 'text-base' : 'text-lg')}>
              {reflection.title}
            </CardTitle>
          </div>
        </div>

        {showLink && (
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 flex-shrink-0 mt-2" />
        )}
      </CardHeader>

      {!compact && (
        <CardContent className="space-y-4">
          {/* Completion stats */}
          {frontmatter.goalsTotal !== undefined && frontmatter.goalsTotal > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Goals completed</span>
                <span className="font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {frontmatter.goalsCompleted} / {frontmatter.goalsTotal}
                </span>
              </div>
              <Progress value={completionPercent} className="h-2" />
            </div>
          )}

          {/* Preview of reflection content */}
          {previewSection && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {previewSection.question}
              </p>
              <p className="text-sm line-clamp-2">{previewSection.answer}</p>
            </div>
          )}
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
        <Link href={`/reflect/${reflection.path}`}>{cardContent}</Link>
      ) : (
        cardContent
      )}
    </motion.div>
  );
}
