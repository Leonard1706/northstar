'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Sparkles,
  ArrowRight,
  Plus,
  Star,
  Target,
  Compass,
  Edit3,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Goal, FocusArea } from '@/types';

interface YearlyGoalSummary {
  year: number;
  emoji?: string;
  theme?: string;
  path: string;
}

export default function VisionPage() {
  const [vision, setVision] = useState<Goal | null>(null);
  const [yearlyGoals, setYearlyGoals] = useState<YearlyGoalSummary[]>([]);
  const [currentYearlyGoal, setCurrentYearlyGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchVisionAndGoals() {
      try {
        // Fetch vision
        const visionRes = await fetch(`/api/goals?vision=${currentYear}`);
        const visionData = await visionRes.json();

        if (visionData.success && visionData.data) {
          setVision(visionData.data);

          // Fetch yearly goals for years within the vision range
          const startYear = visionData.data.frontmatter.startYear || currentYear;
          const endYear = visionData.data.frontmatter.endYear || currentYear;
          const yearlyGoalsList: YearlyGoalSummary[] = [];

          for (let year = startYear; year <= endYear; year++) {
            try {
              const yearRes = await fetch(`/api/goals?year=${year}`);
              const yearData = await yearRes.json();
              if (yearData.success && yearData.data) {
                const yearly = (yearData.data as Goal[]).find(g => g.frontmatter.period === 'yearly');
                if (yearly) {
                  yearlyGoalsList.push({
                    year,
                    emoji: yearly.frontmatter.emoji,
                    theme: yearly.frontmatter.theme,
                    path: yearly.path,
                  });
                  if (year === currentYear) {
                    setCurrentYearlyGoal(yearly);
                  }
                }
              }
            } catch (e) {
              console.error(`Failed to fetch goals for ${year}:`, e);
            }
          }

          setYearlyGoals(yearlyGoalsList);
        }
      } catch (error) {
        console.error('Failed to fetch vision:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVisionAndGoals();
  }, [currentYear]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading your vision...</p>
        </div>
      </div>
    );
  }

  // No vision state
  if (!vision) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className={cn(
          "max-w-lg text-center transition-all duration-500",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="mb-8">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <Compass className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-serif text-4xl font-medium tracking-tight mb-4">
              Define Your North Star
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A vision is your guiding light—the person you want to become and the life you want to live.
              It gives direction to every goal you set.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/goals/new?period=vision"
              className={cn(
                'inline-flex items-center gap-2 px-6 py-3 rounded-xl',
                'bg-primary text-primary-foreground',
                'text-sm font-medium',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              <Sparkles className="h-4 w-4" />
              Create Your Vision
            </Link>

            <p className="text-xs text-muted-foreground">
              This usually takes 15-30 minutes of thoughtful reflection
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Vision exists
  const yearRange = vision.frontmatter.startYear && vision.frontmatter.endYear
    ? `${vision.frontmatter.startYear}–${vision.frontmatter.endYear}`
    : String(currentYear);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        {/* Header */}
        <header className={cn(
          "mb-12 text-center transition-all duration-500",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>

          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium border badge-vision mb-4">
            Vision {yearRange}
          </span>

          <h1 className="font-serif text-4xl lg:text-5xl font-medium tracking-tight mb-4">
            {vision.title && vision.title !== 'Untitled' ? vision.title : 'My Vision'}
          </h1>

          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your guiding star for the years ahead
          </p>

          <div className="flex justify-center mt-6">
            <Link
              href={`/goals/${vision.path}`}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                'text-sm font-medium text-muted-foreground',
                'border border-border/50 hover:bg-muted transition-colors'
              )}
            >
              <Edit3 className="h-4 w-4" />
              Edit Vision
            </Link>
          </div>
        </header>

        {/* Biggest expectations/goals */}
        {vision.expectations && vision.expectations.length > 0 && (
          <section className={cn(
            "mb-12 transition-all duration-500 delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <Star className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl font-medium">Biggest Goals</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {vision.expectations.map((expectation, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-5 rounded-xl border border-border/50 bg-card',
                    'flex items-start gap-4'
                  )}
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{index + 1}</span>
                  </div>
                  <p className="text-sm leading-relaxed pt-1">{expectation}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Focus areas */}
        {vision.focusAreas && vision.focusAreas.length > 0 && (
          <section className={cn(
            "transition-all duration-500 delay-200",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl font-medium">Focus Areas</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {vision.focusAreas.map((area, index) => (
                <FocusAreaCard key={area.id} area={area} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Yearly Journey Section */}
        {yearlyGoals.length > 0 && (
          <section className={cn(
            "mb-12 transition-all duration-500 delay-250",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl font-medium">Your Journey</h2>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {yearlyGoals.map((yearGoal, index) => {
                  const isPast = yearGoal.year < currentYear;
                  const isCurrent = yearGoal.year === currentYear;
                  const isFuture = yearGoal.year > currentYear;

                  return (
                    <Link
                      key={yearGoal.year}
                      href={`/goals/${yearGoal.path}`}
                      className="group block"
                    >
                      <div className={cn(
                        'relative pl-10 py-3',
                        'transition-all duration-200'
                      )}>
                        {/* Timeline dot */}
                        <div className={cn(
                          'absolute left-2 top-4 h-5 w-5 rounded-full border-2 flex items-center justify-center',
                          isCurrent
                            ? 'bg-primary border-primary'
                            : isPast
                            ? 'bg-primary/20 border-primary/40'
                            : 'bg-background border-border'
                        )}>
                          {yearGoal.emoji ? (
                            <span className="text-xs">{yearGoal.emoji}</span>
                          ) : (
                            <div className={cn(
                              'h-2 w-2 rounded-full',
                              isCurrent ? 'bg-primary-foreground' : 'bg-muted-foreground/30'
                            )} />
                          )}
                        </div>

                        <div className={cn(
                          'p-4 rounded-xl border transition-all duration-200',
                          isCurrent
                            ? 'bg-primary/5 border-primary/20 group-hover:border-primary/40'
                            : 'bg-card border-border/50 group-hover:border-border'
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                'text-lg font-serif font-medium',
                                isCurrent && 'text-primary'
                              )}>
                                {yearGoal.year}
                              </span>
                              {isCurrent && (
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {yearGoal.theme && (
                            <p className={cn(
                              'text-sm mt-1',
                              isCurrent ? 'text-foreground' : 'text-muted-foreground'
                            )}>
                              {yearGoal.theme}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Call to action */}
        <section className={cn(
          "mt-16 text-center transition-all duration-500 delay-300",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className={cn(
            'p-8 rounded-2xl',
            'bg-gradient-to-br from-primary/5 to-primary/10',
            'border border-primary/20'
          )}>
            <h3 className="font-serif text-xl font-medium mb-2">
              Make progress toward your vision
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Break down your vision into yearly, quarterly, monthly, and weekly goals.
            </p>
            <Link
              href="/goals"
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl',
                'bg-primary text-primary-foreground',
                'text-sm font-medium',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              View Goals
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

// Focus area card component
function FocusAreaCard({ area, index }: { area: FocusArea; index: number }) {
  return (
    <div
      className={cn(
        'p-6 rounded-xl border border-border/50 bg-card',
        'transition-all duration-200 hover:shadow-sm'
      )}
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="text-2xl">{area.emoji}</span>
        <div>
          <h3 className="font-medium mb-1">{area.name}</h3>
          {area.goal && (
            <p className="text-sm text-muted-foreground">{area.goal}</p>
          )}
        </div>
      </div>

      {area.reason && (
        <div className="mb-4 pl-11">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Why this matters
          </p>
          <p className="text-sm text-muted-foreground italic">"{area.reason}"</p>
        </div>
      )}

      {area.points && area.points.length > 0 && (
        <div className="space-y-2 pl-11">
          {area.points.map((point, i) => (
            <div key={point.id} className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-2 flex-shrink-0" />
              <span className="text-sm">{point.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
