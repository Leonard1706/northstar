'use client';

import { cn } from '@/lib/utils';
import { Target, BookOpen, TrendingUp, Sparkles } from 'lucide-react';

interface QuickPromptsProps {
  onSelect: (prompt: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'God morgen';
  if (hour < 17) return 'God eftermiddag';
  return 'God aften';
}

const prompts = [
  {
    icon: Target,
    label: 'Sæt ugemål',
    prompt: 'Hjælp mig med at sætte mål for denne uge. Kig på mine nuværende månedlige mål og foreslå ugentlige mål der bringer mig tættere på dem.',
  },
  {
    icon: TrendingUp,
    label: 'Status check',
    prompt: 'Giv mig et overblik over mine nuværende mål og fremskridt. Hvor står jeg?',
  },
  {
    icon: BookOpen,
    label: 'Ugerefleksion',
    prompt: 'Hjælp mig med at reflektere over denne uge. Hvad gik godt og hvad kan forbedres?',
  },
  {
    icon: Sparkles,
    label: 'Næste skridt',
    prompt: 'Hvad bør jeg fokusere på lige nu baseret på mine mål og fremskridt?',
  },
];

export function QuickPrompts({ onSelect }: QuickPromptsProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-8">
      <h2 className="font-serif text-2xl font-medium text-foreground/90 mb-2">
        {getGreeting()}
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        Hvad kan jeg hjælpe dig med?
      </p>

      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {prompts.map((prompt) => {
          const Icon = prompt.icon;
          return (
            <button
              key={prompt.label}
              onClick={() => onSelect(prompt.prompt)}
              className={cn(
                'flex flex-col items-start gap-2 p-3 rounded-xl',
                'border border-border/50 bg-card/50',
                'text-left text-sm',
                'hover:bg-muted/50 hover:border-border',
                'transition-all duration-200',
              )}
            >
              <Icon className="h-4 w-4 text-primary/70" />
              <span className="font-medium text-xs">{prompt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
