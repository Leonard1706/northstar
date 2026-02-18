'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Target, Calendar, Sparkles } from 'lucide-react';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GoalTreeNode, PeriodType } from '@/types';

interface GoalTreeProps {
  node: GoalTreeNode;
  level?: number;
  defaultExpanded?: boolean;
}

const periodIcons: Record<PeriodType, React.ElementType> = {
  vision: Sparkles,
  yearly: Target,
  quarterly: Calendar,
  monthly: Calendar,
  weekly: Calendar,
};

const periodColors: Record<PeriodType, string> = {
  vision: 'border-l-purple-500',
  yearly: 'border-l-blue-500',
  quarterly: 'border-l-cyan-500',
  monthly: 'border-l-emerald-500',
  weekly: 'border-l-amber-500',
};

export function GoalTree({ node, level = 0, defaultExpanded = true }: GoalTreeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded && level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = periodIcons[node.period];

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: level * 0.05 }}
        className={cn(
          'group flex items-center gap-3 rounded-lg border-l-4 bg-card p-3 transition-all hover:bg-accent/50',
          periodColors[node.period]
        )}
        style={{ marginLeft: level * 20 }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent',
            !hasChildren && 'invisible'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Icon */}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Content */}
        <Link href={`/goals/${node.path}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{node.title}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {node.period}
            </Badge>
          </div>
          {node.tasksTotal !== undefined && node.tasksTotal > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {node.tasksCompleted} of {node.tasksTotal} tasks
            </p>
          )}
        </Link>

        {/* Progress */}
        <ProgressRing progress={node.progress} size={36} />
      </motion.div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 space-y-1 overflow-hidden"
          >
            {node.children.map((child) => (
              <GoalTree
                key={child.id}
                node={child}
                level={level + 1}
                defaultExpanded={level < 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
