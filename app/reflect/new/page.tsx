'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getWeek, getMonth, getQuarter } from 'date-fns';
import { ReflectionForm } from '@/components/reflections/reflection-form';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronRight,
  Star,
  PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReflectionQuestions, buildContentFromSections } from '@/lib/reflection-utils';
import type { Goal, PeriodType, Reflection } from '@/types';

// Step in the reflection creation flow
type FlowStep = 'select-type' | 'select-period' | 'write';

interface PeriodTypeOption {
  type: PeriodType;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface AvailablePeriod {
  key: string;
  label: string;
  sublabel?: string;
  goal: Goal | null;
  hasReflection: boolean;
  periodData: {
    week?: number;
    month?: number;
    quarter?: number;
  };
}

const periodTypeOptions: PeriodTypeOption[] = [
  {
    type: 'weekly',
    label: 'Weekly',
    description: 'Quick check-in on the past week',
    icon: Clock,
  },
  {
    type: 'monthly',
    label: 'Monthly',
    description: 'Review the month\u0027s progress',
    icon: Calendar,
  },
  {
    type: 'quarterly',
    label: 'Quarterly',
    description: 'Deeper look at the quarter',
    icon: Target,
  },
  {
    type: 'yearly',
    label: 'Yearly',
    description: 'Comprehensive year review',
    icon: Star,
  },
];

function NewReflectionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial values from URL params
  const initialYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();

  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [existingReflections, setExistingReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Flow state
  const [step, setStep] = useState<FlowStep>('select-type');
  const [selectedType, setSelectedType] = useState<PeriodType | null>(null);
  const [selectedPeriodData, setSelectedPeriodData] = useState<AvailablePeriod | null>(null);

  // Period-specific state
  const [year] = useState(initialYear);

  useEffect(() => {
    async function fetchData() {
      try {
        const [goalsRes, reflectionsRes] = await Promise.all([
          fetch(`/api/goals?year=${year}`),
          fetch(`/api/reflections?year=${year}`),
        ]);

        const goalsData = await goalsRes.json();
        const reflectionsData = await reflectionsRes.json();

        if (goalsData.success) {
          setAllGoals(goalsData.data);
        }

        if (reflectionsData.success) {
          setExistingReflections(reflectionsData.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [year]);

  // Check if reflection exists for a specific period
  const hasReflection = (type: PeriodType, periodData: { week?: number; month?: number; quarter?: number }): boolean => {
    return existingReflections.some(r => {
      if (r.frontmatter.period !== type) return false;
      if (type === 'weekly') return r.frontmatter.week === periodData.week;
      if (type === 'monthly') return r.frontmatter.month === periodData.month;
      if (type === 'quarterly') return r.frontmatter.quarter === periodData.quarter;
      if (type === 'yearly') return r.frontmatter.year === year;
      return false;
    });
  };

  // Find goal for a specific period
  const findGoal = (type: PeriodType, periodData: { week?: number; month?: number; quarter?: number }): Goal | null => {
    return allGoals.find(g => {
      if (g.frontmatter.period !== type) return false;
      if (type === 'weekly') return g.frontmatter.week === periodData.week && g.frontmatter.month === periodData.month;
      if (type === 'monthly') return g.frontmatter.month === periodData.month;
      if (type === 'quarterly') return g.frontmatter.quarter === periodData.quarter;
      if (type === 'yearly') return true;
      return false;
    }) || null;
  };

  // Get available periods for a type
  const getAvailablePeriods = (type: PeriodType): AvailablePeriod[] => {
    const now = new Date();
    const currentWeek = getWeek(now, { weekStartsOn: 1 });
    const currentMonth = getMonth(now) + 1;
    const currentQuarter = getQuarter(now);
    const periods: AvailablePeriod[] = [];

    if (type === 'weekly') {
      // Show last 8 weeks that need reflection
      for (let w = currentWeek; w >= Math.max(1, currentWeek - 7); w--) {
        const month = Math.ceil(w / 4.33); // Approximate month
        const periodData = { week: w, month };
        const hasRef = hasReflection(type, periodData);
        if (!hasRef) {
          periods.push({
            key: `week-${w}`,
            label: `Week ${w}`,
            sublabel: hasRef ? 'Already reflected' : undefined,
            goal: findGoal(type, periodData),
            hasReflection: hasRef,
            periodData,
          });
        }
      }
    } else if (type === 'monthly') {
      // Show months that need reflection
      for (let m = currentMonth; m >= 1; m--) {
        const periodData = { month: m };
        const hasRef = hasReflection(type, periodData);
        if (!hasRef) {
          periods.push({
            key: `month-${m}`,
            label: format(new Date(year, m - 1), 'MMMM'),
            goal: findGoal(type, periodData),
            hasReflection: hasRef,
            periodData,
          });
        }
      }
    } else if (type === 'quarterly') {
      // Show quarters that need reflection
      for (let q = currentQuarter; q >= 1; q--) {
        const periodData = { quarter: q };
        const hasRef = hasReflection(type, periodData);
        if (!hasRef) {
          periods.push({
            key: `q${q}`,
            label: `Q${q} ${year}`,
            goal: findGoal(type, periodData),
            hasReflection: hasRef,
            periodData,
          });
        }
      }
    } else if (type === 'yearly') {
      const periodData = {};
      const hasRef = hasReflection(type, periodData);
      if (!hasRef) {
        periods.push({
          key: `yearly-${year}`,
          label: `${year}`,
          goal: findGoal(type, periodData),
          hasReflection: hasRef,
          periodData,
        });
      }
    }

    return periods;
  };

  // Count available (unreflected) periods
  const countAvailablePeriods = (type: PeriodType): number => {
    return getAvailablePeriods(type).length;
  };

  const handleSelectType = (type: PeriodType) => {
    setSelectedType(type);
    const available = getAvailablePeriods(type);
    // If only one period available, auto-select it
    if (available.length === 1) {
      setSelectedPeriodData(available[0]);
      setStep('write');
    } else if (available.length > 0) {
      setStep('select-period');
    }
  };

  const handleSelectPeriod = (period: AvailablePeriod) => {
    setSelectedPeriodData(period);
    setStep('write');
  };

  const handleBack = () => {
    if (step === 'write') {
      const available = selectedType ? getAvailablePeriods(selectedType) : [];
      if (available.length > 1) {
        setStep('select-period');
      } else {
        setStep('select-type');
        setSelectedType(null);
      }
    } else if (step === 'select-period') {
      setStep('select-type');
      setSelectedType(null);
    }
  };

  const handleComplete = async (answers: Record<string, string>) => {
    if (!selectedType || !selectedPeriodData) return;

    const goal = selectedPeriodData.goal;
    const now = new Date();
    const { week, month, quarter } = selectedPeriodData.periodData;

    // Get the questions for this period type to map IDs to question text
    const questions = getReflectionQuestions(selectedType);

    // Transform answers from ID-based keys to question-text-based keys
    // (buildContentFromSections expects question text as keys)
    const sections: Record<string, string> = {};
    for (const q of questions) {
      if (answers[q.id]) {
        // Remove trailing '?' for the section key
        const sectionKey = q.question.replace(/\?$/, '');
        sections[sectionKey] = answers[q.id];
      }
    }

    // Build reflection content using the period-appropriate builder
    const content = buildContentFromSections(
      selectedType,
      sections,
      year,
      quarter
    );

    // Calculate completion stats from goal
    const goalsCompleted = goal?.tasks.filter((t) => t.completed).length || 0;
    const goalsTotal = goal?.tasks.length || 0;
    const completionRate = goalsTotal > 0 ? goalsCompleted / goalsTotal : 0;

    // Build path
    let path = `reflections/${year}/`;
    switch (selectedType) {
      case 'weekly':
        path += `week-${String(week).padStart(2, '0')}-reflection.md`;
        break;
      case 'monthly':
        path += `${format(new Date(year, (month || 1) - 1), 'MMMM').toLowerCase()}-reflection.md`;
        break;
      case 'quarterly':
        path += `q${quarter}-reflection.md`;
        break;
      case 'yearly':
        path += `yearly-reflection.md`;
        break;
    }

    const frontmatter = {
      type: 'reflection' as const,
      period: selectedType,
      year,
      quarter: selectedType === 'quarterly' || selectedType === 'yearly' ? quarter : undefined,
      month: selectedType !== 'yearly' && selectedType !== 'quarterly' ? month : undefined,
      week: selectedType === 'weekly' ? week : undefined,
      date: now.toISOString().split('T')[0],
      goalsCompleted,
      goalsTotal,
      completionRate: Math.round(completionRate * 100) / 100,
      created: now.toISOString(),
      linkedGoalPath: goal?.path,
    };

    try {
      const res = await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, frontmatter, content }),
      });

      const data = await res.json();
      if (data.success) {
        router.push('/reflect');
      }
    } catch (error) {
      console.error('Failed to save reflection:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Refined header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b border-border/50 bg-card/30"
      >
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <PenLine className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight mb-1">
                  New Reflection
                </h1>
                <p className="text-muted-foreground">
                  {step === 'select-type' && 'Choose a reflection type to begin'}
                  {step === 'select-period' && selectedType && `Select which ${selectedType} period`}
                  {step === 'write' && selectedPeriodData && `${selectedPeriodData.label} reflection`}
                </p>
              </div>
            </div>

            {step !== 'select-type' && (
              <button
                onClick={handleBack}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                  'text-sm text-muted-foreground',
                  'hover:text-foreground hover:bg-muted/50',
                  'transition-colors'
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Type */}
          {step === 'select-type' && (
            <motion.div
              key="select-type"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid gap-3">
                {periodTypeOptions.map((option, index) => {
                  const Icon = option.icon;
                  const availableCount = countAvailablePeriods(option.type);
                  const isDisabled = availableCount === 0;

                  return (
                    <motion.button
                      key={option.type}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => !isDisabled && handleSelectType(option.type)}
                      disabled={isDisabled}
                      className={cn(
                        'group text-left w-full p-5 rounded-2xl border',
                        'transition-all duration-200',
                        isDisabled
                          ? 'border-border/30 bg-muted/20 cursor-not-allowed opacity-60'
                          : 'border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0',
                          isDisabled ? 'bg-muted' : 'bg-primary/10'
                        )}>
                          <Icon className={cn(
                            'h-5 w-5',
                            isDisabled ? 'text-muted-foreground' : 'text-primary'
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-medium">{option.label}</h3>
                            {availableCount > 0 ? (
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                'bg-primary/10 text-primary'
                              )}>
                                {availableCount} pending
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3" />
                                All done
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>

                        {!isDisabled && (
                          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Period */}
          {step === 'select-period' && selectedType && (
            <motion.div
              key="select-period"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid gap-2">
                {getAvailablePeriods(selectedType).map((period, index) => {
                  const completedTasks = period.goal?.tasks.filter((t) => t.completed).length || 0;
                  const totalTasks = period.goal?.tasks.length || 0;
                  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                  return (
                    <motion.button
                      key={period.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelectPeriod(period)}
                      className={cn(
                        'group text-left w-full p-4 rounded-xl border border-border/50 bg-card',
                        'hover:border-primary/30 hover:bg-primary/5',
                        'transition-all duration-200'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium">{period.label}</h3>
                          {period.goal ? (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {completedTasks} of {totalTasks} tasks completed
                            </p>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                              No goals set for this period
                            </p>
                          )}
                        </div>

                        {period.goal && totalTasks > 0 && (
                          <div className="relative h-10 w-10 flex-shrink-0">
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
                                className={cn(progress === 100 ? 'stroke-primary' : 'stroke-primary/70')}
                                strokeWidth="3"
                                strokeLinecap="round"
                                fill="none"
                                cx="18"
                                cy="18"
                                r="15.5"
                                strokeDasharray={`${progress} 100`}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums">
                              {progress}%
                            </span>
                          </div>
                        )}

                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 3: Write Reflection */}
          {step === 'write' && selectedPeriodData && (
            <motion.div
              key="write"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Goal Summary - Collapsible context */}
              {selectedPeriodData.goal && selectedPeriodData.goal.tasks.length > 0 && (
                <details className="mb-8 group">
                  <summary className={cn(
                    'flex items-center justify-between p-4 rounded-xl cursor-pointer',
                    'bg-muted/30 border border-border/50',
                    'hover:bg-muted/50 transition-colors',
                    'list-none [&::-webkit-details-marker]:hidden'
                  )}>
                    <div className="flex items-center gap-3">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {selectedPeriodData.label} Goals
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedPeriodData.goal.tasks.filter(t => t.completed).length} / {selectedPeriodData.goal.tasks.length} completed
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>

                  <div className="mt-3 p-4 rounded-xl border border-border/50 bg-card">
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                      {selectedPeriodData.goal.tasks.map(task => (
                        <div
                          key={task.id}
                          className={cn(
                            'flex items-start gap-3 text-sm py-1.5',
                            task.completed && 'text-muted-foreground'
                          )}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={task.completed ? 'line-through' : ''}>
                            {task.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              <ReflectionForm
                questions={getReflectionQuestions(selectedType!)}
                periodLabel={selectedPeriodData.label}
                onComplete={handleComplete}
                onCancel={handleBack}
                periodType={selectedType!}
                year={year}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function NewReflectionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <NewReflectionPageContent />
    </Suspense>
  );
}
