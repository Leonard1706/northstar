'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { format, isToday, differenceInDays } from 'date-fns';
import {
  Check,
  Sparkles,
  ChevronRight,
  CalendarPlus,
  BookOpen,
  TrendingUp,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentPanel } from '@/lib/agent-context';
import { WeeklyProgramView } from '@/components/program/weekly-program';
import { buildWeeklyProgram, getArea, taskLabel } from '@/lib/areas';
import type { Goal, Reflection } from '@/types';

const PLAN_WEEK_PROMPT =
  'Hjælp mig med at planlægge ugens program. Læs mine nuværende månedlige mål (de seks livsområder) og min seneste ugerefleksion, og kog dem ned til konkrete, tidssatte delopgaver fordelt på ugens dage (fx "Gym 07:00" mandag/onsdag/fredag). Sørg for at beskytte de ikke-arbejdsrelaterede områder. Præsentér programmet først, og skriv det først når jeg har godkendt det.';

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
  const [mounted, setMounted] = useState(false);
  const { openWithContext } = useAgentPanel();

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
        if (goalsData.success) setGoals(goalsData.data);
        if (reflectionsData.success) setReflections(reflectionsData.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const weekly = goals?.weekly ?? null;
  const weeklyTasks = useMemo(() => weekly?.tasks ?? [], [weekly]);
  const weekStart = weekly?.frontmatter.start ? new Date(weekly.frontmatter.start) : undefined;

  const program = useMemo(
    () => buildWeeklyProgram(weeklyTasks, weekStart),
    [weeklyTasks, weekStart],
  );
  const todayTasks = useMemo(
    () => program.days.find((d) => d.isToday)?.tasks ?? [],
    [program],
  );

  const completedTasks = weeklyTasks.filter((t) => t.completed).length;
  const progress =
    weeklyTasks.length > 0 ? Math.round((completedTasks / weeklyTasks.length) * 100) : 0;

  // Optimistic toggle + persist
  const toggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!weekly) return;
      setGoals((prev) =>
        prev?.weekly
          ? {
              ...prev,
              weekly: {
                ...prev.weekly,
                tasks: prev.weekly.tasks.map((t) =>
                  t.id === taskId ? { ...t, completed } : t,
                ),
              },
            }
          : prev,
      );
      try {
        await fetch('/api/goals', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: weekly.path, taskId, completed }),
        });
      } catch {
        // revert on failure
        setGoals((prev) =>
          prev?.weekly
            ? {
                ...prev,
                weekly: {
                  ...prev.weekly,
                  tasks: prev.weekly.tasks.map((t) =>
                    t.id === taskId ? { ...t, completed: !completed } : t,
                  ),
                },
              }
            : prev,
        );
      }
    },
    [weekly],
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'God morgen';
    if (hour < 17) return 'God eftermiddag';
    return 'God aften';
  };

  const getContextMessage = () => {
    if (!weekly) return 'Lad os lægge et program for ugen.';
    const remainingToday = todayTasks.filter((t) => !t.completed).length;
    if (todayTasks.length === 0) return 'Ingen planlagte opgaver i dag — nyd det, eller tag fat i ugens program.';
    if (remainingToday === 0) return 'Du har gennemført alt for i dag. Stærkt.';
    if (remainingToday === 1) return 'Én opgave tilbage i dag.';
    return `${remainingToday} opgaver tilbage i dag.`;
  };

  const planWeek = () =>
    openWithContext({
      periodType: 'weekly',
      hint: 'Brugeren vil planlægge ugens program ud fra de månedlige mål.',
      initialPrompt: PLAN_WEEK_PROMPT,
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Indlæser din dag...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        {/* Greeting */}
        <header
          className={cn(
            'mb-10 transition-all duration-500',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}
        >
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {format(new Date(), 'EEEE d. MMMM')}
          </p>
          <h1 className="font-serif text-4xl lg:text-5xl font-medium tracking-tight mb-3">
            {getGreeting()}
          </h1>
          <p className="text-lg text-muted-foreground">{getContextMessage()}</p>
        </header>

        {weekly ? (
          <>
            {/* Today focus */}
            <section
              className={cn(
                'mb-10 transition-all duration-500 delay-100',
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-primary/70" />
                  <h2 className="font-serif text-xl font-medium">I dag</h2>
                </div>
                <Link
                  href={`/goals/${weekly.path}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  Ugens program <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {todayTasks.length > 0 ? (
                <div className="space-y-2">
                  {todayTasks.map((task) => {
                    const area = getArea(task.area);
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'group flex items-center gap-3 p-4 rounded-xl border transition-all duration-300',
                          task.completed
                            ? 'bg-muted/30 border-border/30 opacity-70'
                            : 'bg-card border-border/50 hover:border-border hover:shadow-sm',
                        )}
                      >
                        <button
                          onClick={() => toggleTask(task.id, !task.completed)}
                          className={cn(
                            'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                            task.completed
                              ? 'bg-primary/70 border-primary/70 hover:bg-primary'
                              : 'border-muted-foreground/30 hover:border-primary/60',
                          )}
                        >
                          {task.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                        </button>
                        {task.time && (
                          <span className="flex-shrink-0 font-mono text-xs tabular-nums w-11 text-muted-foreground">
                            {task.time}
                          </span>
                        )}
                        {area && (
                          <span
                            className="flex-shrink-0 h-2 w-2 rounded-full"
                            style={{ backgroundColor: area.color }}
                            title={area.name}
                          />
                        )}
                        <span
                          className={cn(
                            'flex-1 text-sm',
                            task.completed && 'line-through text-muted-foreground',
                          )}
                        >
                          {taskLabel(task)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Ingen opgaver planlagt til i dag i ugens program.
                  </p>
                </div>
              )}
            </section>

            {/* Week program */}
            <section
              className={cn(
                'mb-12 transition-all duration-500 delay-150',
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl font-medium">Ugens program</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {progress}%
                  </span>
                  <button
                    onClick={planWeek}
                    className="text-sm text-primary/80 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <CalendarPlus className="h-4 w-4" /> Genplanlæg
                  </button>
                </div>
              </div>
              <WeeklyProgramView
                tasks={weeklyTasks}
                weekStart={weekStart}
                onToggle={toggleTask}
              />
            </section>
          </>
        ) : (
          /* No program yet → plan with coach */
          <section
            className={cn(
              'mb-12 transition-all duration-500 delay-100',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            )}
          >
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarPlus className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-serif text-xl font-medium mb-2">Intet program for ugen endnu</h3>
              <p className="text-muted-foreground mb-5 max-w-md mx-auto">
                Lad din coach koge månedens mål ned til konkrete, tidssatte opgaver fordelt
                på ugen — så du bare skal følge programmet og krydse af.
              </p>
              <button
                onClick={planWeek}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                  'bg-primary text-primary-foreground text-sm font-medium',
                  'hover:bg-primary/90 transition-colors',
                )}
              >
                <Sparkles className="h-4 w-4" />
                Planlæg ugen med coach
              </button>
            </div>
          </section>
        )}

        {/* Quick links */}
        <section
          className={cn(
            'mb-12 transition-all duration-500 delay-200',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}
        >
          <h3 className="font-serif text-xl font-medium mb-4">Hurtig adgang</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <QuickLink
              href={goals?.monthly ? `/goals/${goals.monthly.path}` : '/goals/new?period=monthly'}
              icon={TrendingUp}
              label="Månedens mål"
              value={
                goals?.monthly
                  ? `${goals.monthly.tasks.filter((t) => t.completed).length}/${goals.monthly.tasks.length} opgaver`
                  : 'Ikke sat'
              }
              isEmpty={!goals?.monthly}
            />
            <QuickLink
              href={goals?.vision ? `/goals/${goals.vision.path}` : '/vision'}
              icon={Sparkles}
              label="Vision"
              value={
                goals?.vision
                  ? `${goals.vision.frontmatter.startYear}-${goals.vision.frontmatter.endYear}`
                  : 'Definér din nordstjerne'
              }
              isEmpty={!goals?.vision}
              accent
            />
            <QuickLink
              href="/reflect/new"
              icon={BookOpen}
              label="Ugentlig check-in"
              value={reflections.length > 0 ? `${reflections.length} seneste` : 'Start refleksion'}
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
              <h3 className="font-serif text-xl font-medium">Seneste refleksioner</h3>
              <Link
                href="/reflect"
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                Se alle <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {reflections.slice(0, 2).map((reflection) => (
                <ReflectionPreview key={reflection.id} reflection={reflection} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

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
          'group p-4 rounded-xl border transition-all duration-200',
          'hover:shadow-sm hover:-translate-y-0.5',
          accent
            ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/30'
            : 'bg-card border-border/50 hover:border-border',
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center',
              accent ? 'bg-primary/10' : 'bg-muted/50',
            )}
          >
            <Icon className={cn('h-4 w-4', accent ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h4 className="font-medium text-sm mb-0.5">{label}</h4>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </Link>
  );
}

function ReflectionPreview({ reflection }: { reflection: Reflection }) {
  const previewSection = reflection.sections.find((s) => s.answer && s.answer.length > 10);
  const date = new Date(reflection.frontmatter.date);
  const daysAgo = differenceInDays(new Date(), date);

  const getDateLabel = () => {
    if (isToday(date)) return 'I dag';
    if (daysAgo === 1) return 'I går';
    if (daysAgo < 7) return `${daysAgo} dage siden`;
    return format(date, 'd. MMM');
  };

  return (
    <Link href={`/reflect/${reflection.path}`}>
      <div
        className={cn(
          'group p-4 rounded-xl border border-border/50 bg-card',
          'transition-all duration-200 hover:border-border hover:shadow-sm',
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
            <span className="text-xs text-muted-foreground">{getDateLabel()}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {previewSection && (
          <p className="text-sm text-muted-foreground line-clamp-2">{previewSection.answer}</p>
        )}
      </div>
    </Link>
  );
}
