'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const toolLabels: Record<string, string> = {
  'mcp__northstar__getCurrentGoals': 'Læser nuværende mål...',
  'mcp__northstar__getReflections': 'Læser refleksioner...',
  'mcp__northstar__getGoalHierarchy': 'Analyserer mål-hierarki...',
  'mcp__northstar__writeGoal': 'Gemmer mål...',
  'mcp__northstar__writeReflection': 'Gemmer refleksion...',
  'mcp__northstar__readGoalFile': 'Læser målfil...',
  'Read': 'Læser fil...',
  'Glob': 'Søger efter filer...',
  'Grep': 'Søger i filer...',
};

export function ToolIndicator({ toolName, className }: { toolName: string; className?: string }) {
  const label = toolLabels[toolName] || `Bruger ${toolName}...`;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg',
      'bg-muted/50 text-muted-foreground text-xs',
      className,
    )}>
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
