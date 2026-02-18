'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getMonth, getYear } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Sparkles,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Goal, Reflection } from '@/types';

interface MonthData {
  month: number;
  monthName: string;
  year: number;
  quarter: number;
  monthlyGoal: Goal | null;
  weeklyGoals: Goal[];
  reflections: Reflection[];
}

export default function GoalsPage() {
  const [vision, setVision] = useState<Goal | null>(null);
  const [yearlyGoal, setYearlyGoal] = useState<Goal | null>(null);
  const [quarterlyGoal, setQuarterlyGoal] = useState<Goal | null>(null);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(getYear(now));
  const [viewMonth, setViewMonth] = useState(getMonth(now) + 1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      // Only show full loading on initial load
      const isInitialLoad = !monthData;
      if (isInitialLoad) {
        setIsLoading(true);
      } else {
        setIsTransitioning(true);
      }

      try {
        const [goalsRes, visionRes, reflectionsRes] = await Promise.all([
          fetch(`/api/goals?year=${viewYear}`),
          fetch(`/api/goals?vision=${viewYear}`),
          fetch(`/api/reflections?year=${viewYear}`),
        ]);

        const goalsData = await goalsRes.json();
        const visionData = await visionRes.json();
        const reflectionsData = await reflectionsRes.json();

        if (visionData.success && visionData.data) {
          setVision(visionData.data);
        } else {
          setVision(null);
        }

        if (goalsData.success) {
          const goals = goalsData.data as Goal[];

          const yearly = goals.find(g => g.frontmatter.period === 'yearly');
          setYearlyGoal(yearly || null);

          const quarter = Math.ceil(viewMonth / 3);

          const quarterly = goals.find(
            g => g.frontmatter.period === 'quarterly' && g.frontmatter.quarter === quarter
          );
          setQuarterlyGoal(quarterly || null);

          const monthly = goals.find(
            g => g.frontmatter.period === 'monthly' && g.frontmatter.month === viewMonth
          );

          const weekly = goals.filter(
            g => g.frontmatter.period === 'weekly' && g.frontmatter.month === viewMonth
          ).sort((a, b) => (a.frontmatter.week || 0) - (b.frontmatter.week || 0));

          const monthReflections = reflectionsData.success
            ? (reflectionsData.data as Reflection[]).filter(
                r => r.frontmatter.month === viewMonth ||
                     (r.frontmatter.period === 'weekly' && r.frontmatter.month === viewMonth)
              )
            : [];

          setMonthData({
            month: viewMonth,
            monthName: format(new Date(viewYear, viewMonth - 1), 'MMMM'),
            year: viewYear,
            quarter,
            monthlyGoal: monthly || null,
            weeklyGoals: weekly,
            reflections: monthReflections,
          });
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
        setIsTransitioning(false);
      }
    }

    fetchData();
  }, [viewYear, viewMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (viewMonth === 1) {
        setViewMonth(12);
        setViewYear(y => y - 1);
      } else {
        setViewMonth(m => m - 1);
      }
    } else {
      if (viewMonth === 12) {
        setViewMonth(1);
        setViewYear(y => y + 1);
      } else {
        setViewMonth(m => m + 1);
      }
    }
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setViewYear(y => direction === 'prev' ? y - 1 : y + 1);
  };

  const calculateProgress = (goal: Goal | null) => {
    if (!goal || goal.tasks.length === 0) return 0;
    return Math.round((goal.tasks.filter(t => t.completed).length / goal.tasks.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
        {/* Page header */}
        <header className={cn(
          "mb-12 transition-all duration-500",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-serif text-4xl font-medium tracking-tight mb-2">
                Goals
              </h1>
              <p className="text-muted-foreground">
                Your roadmap from vision to action
              </p>
            </div>

            <Link
              href="/goals/new"
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-primary text-primary-foreground',
                'text-sm font-medium',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              <Plus className="h-4 w-4" />
              New Goal
            </Link>
          </div>

          {/* Year navigation */}
          <div className="flex items-center justify-center gap-6 py-6 border-y border-border/50">
            <button
              onClick={() => navigateYear('prev')}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="text-center">
              {yearlyGoal?.frontmatter.emoji && (
                <span className="text-3xl block mb-1">{yearlyGoal.frontmatter.emoji}</span>
              )}
              <span className="text-3xl font-serif font-medium">{viewYear}</span>
              {yearlyGoal?.frontmatter.theme && (
                <p className="text-sm text-muted-foreground mt-1">
                  {yearlyGoal.frontmatter.theme}
                </p>
              )}
            </div>

            <button
              onClick={() => navigateYear('next')}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Goal hierarchy - Timeline style */}
        <div className="space-y-8">
          {/* Vision */}
          <section className={cn(
            "transition-all duration-500 delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <TimelineItem
              label="Vision"
              badge={vision ? `${vision.frontmatter.startYear}-${vision.frontmatter.endYear}` : undefined}
              badgeClass="badge-vision"
              icon={Sparkles}
              isEmpty={!vision}
              emptyText="Define your north star"
              emptyAction={{ href: '/goals/new?period=vision', label: 'Create Vision' }}
            >
              {vision && (
                <Link href={`/goals/${vision.path}`} className="group block">
                  <div className={cn(
                    'p-5 rounded-xl border border-border/50 bg-card',
                    'transition-all duration-200',
                    'hover:border-primary/20 hover:shadow-sm'
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <p className="font-medium">{vision.title && vision.title !== 'Untitled' ? vision.title : 'My Vision'}</p>
                        {vision.expectations && vision.expectations.length > 0 && (
                          <div className="space-y-1">
                            {vision.expectations.slice(0, 3).map((exp, i) => (
                              <p key={i} className="text-sm text-muted-foreground line-clamp-1">
                                • {exp}
                              </p>
                            ))}
                            {vision.expectations.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{vision.expectations.length - 3} more
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              )}
            </TimelineItem>
          </section>

          {/* Yearly */}
          <section className={cn(
            "transition-all duration-500 delay-150",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <TimelineItem
              label="Yearly Focus"
              badge={String(viewYear)}
              badgeClass="badge-yearly"
              icon={Target}
              isEmpty={!yearlyGoal}
              emptyText="Set your focus for this year"
              emptyAction={{ href: `/goals/new?period=yearly&year=${viewYear}`, label: 'Add Yearly Focus' }}
            >
              {yearlyGoal && (
                <Link href={`/goals/${yearlyGoal.path}`} className="group block">
                  <div className={cn(
                    'p-5 rounded-xl border border-border/50 bg-card',
                    'transition-all duration-200',
                    'hover:border-primary/20 hover:shadow-sm'
                  )}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {yearlyGoal.frontmatter.emoji && (
                            <span className="text-lg">{yearlyGoal.frontmatter.emoji}</span>
                          )}
                          <p className="font-medium">
                            {yearlyGoal.frontmatter.theme || yearlyGoal.title}
                          </p>
                        </div>
                        {yearlyGoal.focusAreas && yearlyGoal.focusAreas.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {yearlyGoal.focusAreas.slice(0, 4).map((area) => (
                              <span
                                key={area.id}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted/50"
                              >
                                <span>{area.emoji}</span>
                                <span className="text-muted-foreground">{area.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              )}
            </TimelineItem>
          </section>

          {/* Quarterly */}
          <section className={cn(
            "transition-all duration-500 delay-200",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <TimelineItem
              label="Quarterly Focus"
              badge={`Q${monthData?.quarter} ${viewYear}`}
              badgeClass="badge-quarterly"
              icon={Target}
              isEmpty={!quarterlyGoal}
              emptyText="Define your quarter goals"
              emptyAction={{ href: `/goals/new?period=quarterly&year=${viewYear}&quarter=${monthData?.quarter}`, label: 'Add Quarterly Focus' }}
            >
              {quarterlyGoal && (
                <Link href={`/goals/${quarterlyGoal.path}`} className="group block">
                  <div className={cn(
                    'p-5 rounded-xl border border-border/50 bg-card',
                    'transition-all duration-200',
                    'hover:border-primary/20 hover:shadow-sm'
                  )}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium mb-2">{quarterlyGoal.title && quarterlyGoal.title !== 'Untitled' ? quarterlyGoal.title : 'Q' + monthData?.quarter + ' Focus'}</p>
                        {quarterlyGoal.focusAreas && quarterlyGoal.focusAreas.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {quarterlyGoal.focusAreas.slice(0, 3).map((area) => (
                              <span
                                key={area.id}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted/50"
                              >
                                <span>{area.emoji}</span>
                                <span className="text-muted-foreground">{area.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              )}
            </TimelineItem>
          </section>

          {/* Monthly - Expanded view */}
          <section className={cn(
            "transition-all duration-500 delay-300",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="relative pl-8 border-l-2 border-border/50">
              {/* Month navigation header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                    <Calendar className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Monthly
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        disabled={isTransitioning}
                      >
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <span className="font-serif text-xl font-medium min-w-[140px] text-center">
                        {monthData?.monthName}
                      </span>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        disabled={isTransitioning}
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>

                {!monthData?.monthlyGoal && (
                  <Link
                    href={`/goals/new?period=monthly&year=${viewYear}&month=${viewMonth}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                      'text-xs font-medium text-muted-foreground',
                      'border border-dashed border-border',
                      'hover:border-primary/30 hover:text-primary transition-colors'
                    )}
                  >
                    <Plus className="h-3 w-3" />
                    Add Monthly Goals
                  </Link>
                )}
              </div>

              {/* Monthly goal card with smooth transition */}
              <div className={cn(
                "transition-opacity duration-200",
                isTransitioning && "opacity-50"
              )}>
                <AnimatePresence mode="wait">
                  {monthData?.monthlyGoal && (
                    <motion.div
                      key={`monthly-${monthData.month}-${monthData.year}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MonthlyGoalCard goal={monthData.monthlyGoal} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Weekly goals with smooth transition */}
              <div className={cn(
                "mt-6 space-y-4 transition-opacity duration-200",
                isTransitioning && "opacity-50"
              )}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">Weekly Breakdown</h4>
                  <Link
                    href={`/goals/new?period=weekly&year=${viewYear}&month=${viewMonth}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Week
                  </Link>
                </div>

                <AnimatePresence mode="wait">
                  {monthData?.weeklyGoals && monthData.weeklyGoals.length > 0 ? (
                    <motion.div
                      key={`weekly-${monthData.month}-${monthData.year}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid gap-3 md:grid-cols-2"
                    >
                      {monthData.weeklyGoals.map((weekGoal) => {
                        const progress = calculateProgress(weekGoal);
                        const reflection = monthData.reflections.find(
                          r => r.frontmatter.period === 'weekly' && r.frontmatter.week === weekGoal.frontmatter.week
                        );

                        return (
                          <WeeklyGoalCard
                            key={weekGoal.id}
                            goal={weekGoal}
                            progress={progress}
                            reflection={reflection}
                          />
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`empty-${monthData?.month}-${monthData?.year}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'p-6 rounded-xl border border-dashed border-border/50',
                        'text-center text-sm text-muted-foreground'
                      )}
                    >
                      No weekly goals for {monthData?.monthName}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Timeline item wrapper
function TimelineItem({
  label,
  badge,
  badgeClass,
  icon: Icon,
  isEmpty,
  emptyText,
  emptyAction,
  children,
}: {
  label: string;
  badge?: string;
  badgeClass?: string;
  icon: React.ElementType;
  isEmpty: boolean;
  emptyText: string;
  emptyAction: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="relative pl-8 border-l-2 border-border/50 pb-8">
      {/* Timeline dot */}
      <div className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-background border-2 border-muted-foreground/30 flex items-center justify-center">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {badge && (
          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium border', badgeClass)}>
            {badge}
          </span>
        )}
      </div>

      {/* Content */}
      {isEmpty ? (
        <div className={cn(
          'p-5 rounded-xl border border-dashed border-border/50',
          'flex items-center justify-between'
        )}>
          <span className="text-sm text-muted-foreground">{emptyText}</span>
          <Link
            href={emptyAction.href}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'text-xs font-medium',
              'bg-muted hover:bg-muted/80 transition-colors'
            )}
          >
            <Plus className="h-3 w-3" />
            {emptyAction.label}
          </Link>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// Monthly goal card
function MonthlyGoalCard({ goal }: { goal: Goal }) {
  const completedTasks = goal.tasks.filter(t => t.completed).length;
  const totalTasks = goal.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Link href={`/goals/${goal.path}`} className="group block">
      <div className={cn(
        'p-5 rounded-xl border border-border/50 bg-card',
        'transition-all duration-200',
        'hover:border-primary/20 hover:shadow-sm'
      )}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border badge-monthly mb-2">
              Monthly Goals
            </span>
            <p className="font-medium">{goal.title && goal.title !== 'Untitled' ? goal.title : 'Monthly Focus'}</p>
          </div>

          {/* Progress ring */}
          <div className="relative">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle
                className="progress-track"
                strokeWidth="3"
                fill="none"
                cx="18"
                cy="18"
                r="15.5"
              />
              <circle
                className="stroke-primary"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                cx="18"
                cy="18"
                r="15.5"
                strokeDasharray={`${progress} 100`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
              {progress}%
            </span>
          </div>
        </div>

        {/* Task preview */}
        {totalTasks > 0 && (
          <div className="space-y-2">
            {goal.tasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                {task.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className={cn(
                  'line-clamp-1',
                  task.completed && 'text-muted-foreground line-through'
                )}>
                  {task.text}
                </span>
              </div>
            ))}
            {totalTasks > 3 && (
              <p className="text-xs text-muted-foreground pl-6">
                +{totalTasks - 3} more tasks
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {completedTasks} of {totalTasks} completed
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
            View details
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Weekly goal card
function WeeklyGoalCard({
  goal,
  progress,
  reflection,
}: {
  goal: Goal;
  progress: number;
  reflection?: Reflection;
}) {
  const completedTasks = goal.tasks.filter(t => t.completed).length;
  const totalTasks = goal.tasks.length;

  return (
    <div className={cn(
      'p-4 rounded-xl border border-border/50 bg-card',
      'transition-all duration-200',
      progress === 100 && 'border-primary/20 bg-primary/5'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border mb-1',
            progress === 100 ? 'badge-monthly' : 'badge-weekly'
          )}>
            Week {goal.frontmatter.week}
          </span>
          <p className="font-medium text-sm line-clamp-1">{goal.title && goal.title !== 'Untitled' ? goal.title : `Week ${goal.frontmatter.week}`}</p>
        </div>

        {/* Progress indicator */}
        <div className="relative h-11 w-11 flex-shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <circle
              className="progress-track"
              strokeWidth="3"
              fill="none"
              cx="18"
              cy="18"
              r="15.5"
            />
            <circle
              className={cn(
                progress === 100 ? 'stroke-primary' : 'stroke-primary/70'
              )}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              cx="18"
              cy="18"
              r="15.5"
              strokeDasharray={`${progress} 100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
            {progress}%
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {completedTasks} of {totalTasks} tasks
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={`/goals/${goal.path}`}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg',
            'text-xs font-medium border border-border/50',
            'hover:bg-muted transition-colors'
          )}
        >
          View
        </Link>

        {reflection ? (
          <Link
            href={`/reflect/${reflection.path}`}
            className={cn(
              'inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg',
              'text-xs font-medium text-muted-foreground',
              'border border-border/50',
              'hover:bg-muted transition-colors'
            )}
          >
            <BookOpen className="h-3 w-3" />
          </Link>
        ) : (
          <Link
            href={`/reflect/new?period=weekly&week=${goal.frontmatter.week}&month=${goal.frontmatter.month}&year=${goal.frontmatter.year}`}
            className={cn(
              'inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg',
              'text-xs font-medium text-muted-foreground',
              'border border-dashed border-border/50',
              'hover:border-primary/30 hover:text-primary transition-colors'
            )}
          >
            <Plus className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
