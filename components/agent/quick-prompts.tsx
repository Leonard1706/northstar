'use client';

import { cn } from '@/lib/utils';
import { CalendarDays, Target, BookOpen, TrendingUp } from 'lucide-react';

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
    icon: CalendarDays,
    label: 'Planlæg ugen',
    prompt:
      'Hjælp mig med at planlægge ugens program. Læs mine nuværende månedlige mål (de seks livsområder) og min seneste ugerefleksion, og kog dem ned til konkrete, tidssatte delopgaver fordelt på ugens dage (fx "Gym 07:00" mandag/onsdag/fredag). Beskyt de ikke-arbejdsrelaterede områder. Præsentér programmet først, og skriv det først når jeg har godkendt det.',
  },
  {
    icon: Target,
    label: 'Planlæg måneden',
    prompt:
      'Hjælp mig med at sætte månedens mål. Tag udgangspunkt i kvartalsmålene og fordel konkrete opgaver på tværs af mine seks livsområder, så ingen områder bliver glemt. Markér hver opgave med dens #område-tag. Præsentér først, og skriv det først når jeg har godkendt det.',
  },
  {
    icon: BookOpen,
    label: 'Ugentlig check-in',
    prompt:
      'Hjælp mig med ugens check-in. Gennemgå hvilke opgaver i ugens program jeg har krydset af, og hjælp mig kort med at reflektere over to ting: hvorfor det gik som det gik, og hvad jeg har lært.',
  },
  {
    icon: TrendingUp,
    label: 'Status',
    prompt:
      'Giv mig et hurtigt overblik: hvor står jeg på månedens mål og ugens program — og er der et livsområde (fx relationer, oplevelser, fitness eller læring) jeg har forsømt på det seneste?',
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
