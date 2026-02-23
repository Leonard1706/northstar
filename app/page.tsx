'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isThisWeek, differenceInDays } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronRight,
  Plus,
  Calendar,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Goal, Reflection, Task } from '@/types';

interface DashboardData {
  weekly: Goal | null;
  monthly: Goal | null;
  quarterly: Goal | null;
  yearly: Goal | null;
  vision: Goal | null;
}

export default function TodayPage() {
  const [goals, setGoals] = useState<DashboardData | null>(null);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [goalsRes, reflectionsRes] = await Promise.all([
          fetch('/api/goals?current=true'),
          fetch('/api/reflections?recent=3'),
        ]);

        const goalsData = await goalsRes.json();
        const reflectionsData = await reflectionsRes.json();

        if (goalsData.success) {
          setGoals(goalsData.data);
        }

        if (reflectionsData.success) {
          setReflections(reflectionsData.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const weeklyTasks = goals?.weekly?.tasks || [];
  const completedTasks = weeklyTasks.filter((t) => t.completed);
  const remainingTasks = weeklyTasks.filter((t) => !t.completed);
  const progress =
    weeklyTasks.length > 0
      ? Math.round((completedTasks.length / weeklyTasks.length) * 100)
      : 0;

  // Handler to update task completion in local state
  const handleTaskUpdate = (taskId: string, completed: boolean) => {
    if (!goals?.weekly) return;

    setGoals((prev) => {
      if (!prev?.weekly) return prev;
      return {
        ...prev,
        weekly: {
          ...prev.weekly,
          tasks: prev.weekly.tasks.map((t) =>
            t.id === taskId ? { ...t, completed } : t,
          ),
        },
      };
    });
  };

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get contextual message
  const getContextMessage = () => {
    if (!goals?.weekly) return "Let's set some goals for this week.";
    if (progress === 100) return 'You completed everything this week!';
    if (progress >= 75) return "You're almost there, keep going.";
    if (progress >= 50) return 'Great progress so far.';
    if (remainingTasks.length === 1) return 'Just one more to go.';
    return `${remainingTasks.length} tasks remaining this week.`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your day...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        {/* Header section - Greeting */}
        <header
          className={cn(
            'mb-12 transition-all duration-500',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}
        >
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <h1 className="font-serif text-4xl lg:text-5xl font-medium tracking-tight mb-3">
            {getGreeting()}
          </h1>
          <p className="text-lg text-muted-foreground">{getContextMessage()}</p>
        </header>

        {/* Progress overview */}
        {goals?.weekly && (
          <section
            className={cn(
              'mb-12 transition-all duration-500 delay-100',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            )}
          >
            <Link href={`/goals/${goals.weekly.path}`} className="group block">
              <div
                className={cn(
                  'relative rounded-2xl overflow-hidden',
                  'bg-gradient-to-br from-card to-card/80',
                  'border border-border/50',
                  'p-6 lg:p-8',
                  'transition-all duration-300',
                  'hover:shadow-lg hover:shadow-primary/5',
                  'hover:border-primary/20',
                )}
              >
                {/* Progress bar background */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-1000 ease-out"
                    style={{ width: mounted ? `${progress}%` : '0%' }}
                  />
                </div>

                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        This Week
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium badge-weekly border">
                        Week {goals.weekly.frontmatter.week}
                      </span>
                    </div>
                    <h2 className="font-serif text-2xl lg:text-3xl font-medium">
                      {goals.weekly.title && goals.weekly.title !== 'Untitled'
                        ? goals.weekly.title
                        : 'Weekly Focus'}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                    <span className="text-sm font-medium">View details</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>

                {/* Progress stats */}
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
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
                          className="stroke-primary transition-all duration-1000 ease-out"
                          strokeWidth="3"
                          strokeLinecap="round"
                          fill="none"
                          cx="18"
                          cy="18"
                          r="15.5"
                          strokeDasharray={
                            mounted ? `${progress} 100` : '0 100'
                          }
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                        {progress}%
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {completedTasks.length} of {weeklyTasks.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        tasks completed
                      </p>
                    </div>
                  </div>

                  {remainingTasks.length > 0 && (
                    <div className="hidden sm:block border-l border-border pl-8">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Next up
                      </p>
                      <p className="text-sm line-clamp-1">
                        {remainingTasks[0].text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Tasks section */}
        {goals?.weekly && weeklyTasks.length > 0 && (
          <section
            className={cn(
              'mb-12 transition-all duration-500 delay-150',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-medium">
                Tasks to complete
              </h3>
              <span className="text-sm text-muted-foreground">
                {remainingTasks.length} remaining
              </span>
            </div>

            <div className="space-y-2">
              {/* Incomplete tasks first */}
              {remainingTasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={index}
                  goalPath={goals.weekly!.path}
                  onTaskUpdate={handleTaskUpdate}
                />
              ))}

              {/* Completed tasks at the bottom */}
              {completedTasks.length > 0 && (
                <>
                  {remainingTasks.length > 0 && completedTasks.length > 0 && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-xs text-muted-foreground">
                        {completedTasks.length} completed
                      </span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                  )}
                  {completedTasks.map((task, index) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      index={remainingTasks.length + index}
                      goalPath={goals.weekly!.path}
                      onTaskUpdate={handleTaskUpdate}
                    />
                  ))}
                </>
              )}
            </div>
          </section>
        )}

        {/* Empty state for no weekly goals */}
        {!goals?.weekly && (
          <section
            className={cn(
              'mb-12 transition-all duration-500 delay-150',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            )}
          >
            <div
              className={cn(
                'rounded-2xl border border-dashed border-border',
                'bg-muted/20 p-8 text-center',
              )}
            >
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <h3 className="font-serif text-xl font-medium mb-2">
                No weekly goals set
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Start your week with clear intentions. What do you want to
                accomplish?
              </p>
              <Link
                href="/goals/new?period=weekly"
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                  'bg-primary text-primary-foreground',
                  'text-sm font-medium',
                  'hover:bg-primary/90 transition-colors',
                )}
              >
                <Plus className="h-4 w-4" />
                Set weekly goals
              </Link>
            </div>
          </section>
        )}

        {/* Quick links grid */}
        <section
          className={cn(
            'mb-12 transition-all duration-500 delay-200',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}
        >
          <h3 className="font-serif text-xl font-medium mb-4">Quick access</h3>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Monthly goals */}
            <QuickLink
              href={
                goals?.monthly
                  ? `/goals/${goals.monthly.path}`
                  : '/goals/new?period=monthly'
              }
              icon={TrendingUp}
              label="Monthly Goals"
              value={
                goals?.monthly
                  ? `${goals.monthly.tasks.filter((t) => t.completed).length}/${goals.monthly.tasks.length} tasks`
                  : 'Not set'
              }
              isEmpty={!goals?.monthly}
            />

            {/* Vision */}
            <QuickLink
              href={goals?.vision ? `/goals/${goals.vision.path}` : '/vision'}
              icon={Sparkles}
              label="Vision"
              value={
                goals?.vision
                  ? `${goals.vision.frontmatter.startYear || new Date().getFullYear()}-${goals.vision.frontmatter.endYear || new Date().getFullYear() + 5}`
                  : 'Define your north star'
              }
              isEmpty={!goals?.vision}
              accent
            />

            {/* Reflect */}
            <QuickLink
              href="/reflect/new"
              icon={BookOpen}
              label="Reflect"
              value={
                reflections.length > 0
                  ? `${reflections.length} recent`
                  : 'Start reflecting'
              }
              isEmpty={reflections.length === 0}
            />
          </div>
        </section>

        {/* Recent reflections */}
        {reflections.length > 0 && (
          <section
            className={cn(
              'transition-all duration-500 delay-300',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-medium">
                Recent reflections
              </h3>
              <Link
                href="/reflect"
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {reflections.slice(0, 2).map((reflection) => (
                <ReflectionPreview
                  key={reflection.id}
                  reflection={reflection}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// Task item component
function TaskItem({
  task,
  index,
  goalPath,
  onTaskUpdate,
}: {
  task: Task;
  index: number;
  goalPath: string;
  onTaskUpdate: (taskId: string, completed: boolean) => void;
}) {
  const [isChecked, setIsChecked] = useState(task.completed);
  const [mounted, setMounted] = useState(false);

  // Sync local state when task prop changes
  useEffect(() => {
    setIsChecked(task.completed);
  }, [task.completed]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  const handleToggle = async () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onTaskUpdate(task.id, newValue);

    try {
      await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: goalPath,
          taskId: task.id,
          completed: newValue,
        }),
      });
    } catch (error) {
      setIsChecked(!newValue); // Revert on error
      onTaskUpdate(task.id, !newValue); // Revert parent state too
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={cn(
        'group flex items-center gap-3 p-4 rounded-xl',
        'border transition-all duration-300',
        isChecked
          ? 'bg-muted/30 border-border/30'
          : 'bg-card border-border/50 hover:border-border hover:shadow-sm',
      )}
    >
      <button
        onClick={handleToggle}
        className={cn(
          'flex-shrink-0 h-5 w-5 rounded-full',
          'border-2 transition-all duration-200',
          isChecked
            ? 'bg-primary/60 border-primary/60 hover:bg-primary hover:border-primary'
            : 'border-muted-foreground/30 hover:border-primary/50',
        )}
      >
        {isChecked && (
          <div className="flex items-center justify-center h-full">
            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </button>

      <span
        className={cn(
          'flex-1 text-sm transition-all duration-200',
          isChecked && 'line-through text-muted-foreground/70',
        )}
      >
        {task.text}
      </span>

      {task.section && (
        <span
          className={cn(
            'text-xs px-2 py-1 rounded-md',
            isChecked
              ? 'text-muted-foreground/50 bg-muted/30'
              : 'text-muted-foreground bg-muted/50',
          )}
        >
          {task.section}
        </span>
      )}
    </motion.div>
  );
}

// Quick link component
function QuickLink({
  href,
  icon: Icon,
  label,
  value,
  isEmpty,
  accent,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  value: string;
  isEmpty?: boolean;
  accent?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={cn(
          'group p-4 rounded-xl border transition-all duration-300',
          'hover:shadow-lg hover:-translate-y-0.5',
          accent
            ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/50 hover:shadow-primary/20'
            : 'bg-card border-border/50 hover:border-border hover:shadow-primary/10',
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center',
              accent ? 'bg-primary/10' : 'bg-muted/50',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                accent ? 'text-primary' : 'text-muted-foreground',
              )}
            />
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <h4 className="font-medium text-sm mb-0.5">{label}</h4>
        <p
          className={cn(
            'text-xs',
            isEmpty ? 'text-muted-foreground' : 'text-muted-foreground',
          )}
        >
          {value}
        </p>
      </div>
    </Link>
  );
}

// Reflection preview component
function ReflectionPreview({ reflection }: { reflection: Reflection }) {
  const previewSection = reflection.sections.find(
    (s) => s.answer && s.answer.length > 10,
  );
  const date = new Date(reflection.frontmatter.date);
  const daysAgo = differenceInDays(new Date(), date);

  const getDateLabel = () => {
    if (isToday(date)) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    return format(date, 'MMM d');
  };

  return (
    <Link href={`/reflect/${reflection.path}`}>
      <div
        className={cn(
          'group p-4 rounded-xl border border-border/50 bg-card',
          'transition-all duration-200',
          'hover:border-border hover:shadow-sm',
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
                `badge-${reflection.frontmatter.period}`,
              )}
            >
              {reflection.frontmatter.period}
            </span>
            <span className="text-xs text-muted-foreground">
              {getDateLabel()}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {previewSection && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {previewSection.answer}
          </p>
        )}
      </div>
    </Link>
  );
}
