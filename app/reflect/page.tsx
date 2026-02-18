'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays, isToday, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { Plus, BookOpen, ChevronRight, Calendar, Sparkles, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reflection, PeriodType } from '@/types';

type FilterType = 'all' | PeriodType;

export default function ReflectionsPage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchReflections() {
      try {
        const res = await fetch('/api/reflections');
        const data = await res.json();
        if (data.success) {
          setReflections(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch reflections:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReflections();
  }, []);

  // Filter and group reflections
  const { filteredReflections, groupedByMonth, totalCount, streakDays } = useMemo(() => {
    const filtered = filter === 'all'
      ? reflections
      : reflections.filter((r) => r.frontmatter.period === filter);

    const yearFiltered = filtered.filter(
      r => new Date(r.frontmatter.date).getFullYear() === viewYear
    );

    // Group by month
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(viewYear, 0)),
      end: endOfYear(new Date(viewYear, 0)),
    });

    const grouped = months.map(monthDate => {
      const monthNum = monthDate.getMonth() + 1;
      const monthReflections = yearFiltered.filter(
        r => new Date(r.frontmatter.date).getMonth() + 1 === monthNum
      );
      return {
        month: monthNum,
        monthName: format(monthDate, 'MMMM'),
        reflections: monthReflections.sort(
          (a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
        ),
      };
    }).filter(m => m.reflections.length > 0).reverse();

    // Calculate streak (consecutive weeks with reflections)
    let streak = 0;
    const weeklyReflections = reflections.filter(r => r.frontmatter.period === 'weekly');
    if (weeklyReflections.length > 0) {
      const sortedDates = weeklyReflections
        .map(r => new Date(r.frontmatter.date))
        .sort((a, b) => b.getTime() - a.getTime());

      for (let i = 0; i < sortedDates.length - 1; i++) {
        const diff = differenceInDays(sortedDates[i], sortedDates[i + 1]);
        if (diff <= 10) { // Allow some flexibility (weekly = ~7 days)
          streak++;
        } else {
          break;
        }
      }
    }

    return {
      filteredReflections: yearFiltered,
      groupedByMonth: grouped,
      totalCount: filtered.length,
      streakDays: streak,
    };
  }, [reflections, filter, viewYear]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
    },
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
          <p className="text-sm text-muted-foreground">Loading reflections...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto px-6 py-12 lg:py-16"
      >
        {/* Header */}
        <motion.header variants={itemVariants} className="mb-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-serif text-4xl font-medium tracking-tight mb-2">
                Reflections
              </h1>
              <p className="text-muted-foreground">
                Look back to move forward with clarity
              </p>
            </div>

            <Link
              href="/reflect/new"
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-primary text-primary-foreground',
                'text-sm font-medium',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              <Plus className="h-4 w-4" />
              New Reflection
            </Link>
          </div>

          {/* Stats row */}
          {reflections.length > 0 && (
            <div className="flex items-center gap-6 py-4 border-y border-border/50">
              <div>
                <span className="text-2xl font-serif font-medium">{totalCount}</span>
                <p className="text-xs text-muted-foreground">total reflections</p>
              </div>
              {streakDays > 0 && (
                <div className="border-l border-border pl-6">
                  <span className="text-2xl font-serif font-medium">{streakDays}</span>
                  <p className="text-xs text-muted-foreground">week streak</p>
                </div>
              )}
              <div className="border-l border-border pl-6">
                <span className="text-2xl font-serif font-medium">{filteredReflections.length}</span>
                <p className="text-xs text-muted-foreground">in {viewYear}</p>
              </div>
            </div>
          )}
        </motion.header>

        {/* Filters */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly' },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value as FilterType)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      filter === f.value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Year switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewYear(y => y - 1)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
              </button>
              <span className="text-sm font-medium min-w-[60px] text-center">{viewYear}</span>
              <button
                onClick={() => setViewYear(y => y + 1)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        {groupedByMonth.length > 0 ? (
          <div className="space-y-10">
            {groupedByMonth.map((monthGroup) => (
              <motion.section key={monthGroup.month} variants={itemVariants}>
                {/* Month header */}
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-serif text-lg font-medium">{monthGroup.monthName}</h2>
                  <span className="text-xs text-muted-foreground">
                    {monthGroup.reflections.length} reflection{monthGroup.reflections.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Reflection cards */}
                <div className="space-y-3">
                  {monthGroup.reflections.map((reflection, index) => (
                    <ReflectionCard
                      key={reflection.id}
                      reflection={reflection}
                      index={index}
                    />
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        ) : (
          <motion.div variants={itemVariants}>
            <EmptyState filter={filter} year={viewYear} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// Reflection card component
function ReflectionCard({ reflection, index }: { reflection: Reflection; index: number }) {
  const date = new Date(reflection.frontmatter.date);
  const daysAgo = differenceInDays(new Date(), date);

  const getDateLabel = () => {
    if (isToday(date)) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    return format(date, 'MMM d, yyyy');
  };

  // Get first meaningful answer for preview
  const previewSection = reflection.sections.find((s) => s.answer && s.answer.length > 10);

  // Get completion stats if available
  const hasStats = reflection.frontmatter.goalsTotal !== undefined && reflection.frontmatter.goalsTotal > 0;
  const completionPercent = hasStats ? Math.round((reflection.frontmatter.completionRate || 0) * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link href={`/reflect/${reflection.path}`} className="group block">
        <div className={cn(
          'p-5 rounded-xl border border-border/50 bg-card',
          'transition-all duration-200',
          'hover:border-border hover:shadow-sm'
        )}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className={cn(
                'inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border',
                `badge-${reflection.frontmatter.period}`
              )}>
                {reflection.frontmatter.period}
              </span>

              {reflection.frontmatter.period === 'weekly' && reflection.frontmatter.week && (
                <span className="text-xs text-muted-foreground">
                  Week {reflection.frontmatter.week}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{getDateLabel()}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Preview content */}
          {previewSection && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1 line-clamp-1">
                {previewSection.question}
              </p>
              <p className="text-sm line-clamp-2">
                {previewSection.answer}
              </p>
            </div>
          )}

          {/* Stats footer */}
          {hasStats && (
            <div className="flex items-center gap-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {reflection.frontmatter.goalsCompleted}/{reflection.frontmatter.goalsTotal} goals
                </span>
              </div>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// Empty state component
function EmptyState({ filter, year }: { filter: FilterType; year: number }) {
  const isCurrentYear = year === new Date().getFullYear();

  return (
    <div className={cn(
      'rounded-2xl border border-dashed border-border',
      'bg-muted/20 p-12 text-center'
    )}>
      <div className="flex justify-center mb-4">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <BookOpen className="h-7 w-7 text-muted-foreground" />
        </div>
      </div>

      <h3 className="font-serif text-xl font-medium mb-2">
        {filter === 'all'
          ? `No reflections in ${year}`
          : `No ${filter} reflections in ${year}`}
      </h3>

      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {isCurrentYear
          ? 'Reflections help you learn from experiences and grow. Start your first one today.'
          : 'Travel back to the present to create a new reflection.'}
      </p>

      {isCurrentYear && (
        <Link
          href="/reflect/new"
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl',
            'bg-primary text-primary-foreground',
            'text-sm font-medium',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <Sparkles className="h-4 w-4" />
          Start your first reflection
        </Link>
      )}
    </div>
  );
}
