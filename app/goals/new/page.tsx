'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { format, getWeek, getMonth, getQuarter, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addYears } from 'date-fns';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Star,
  Target,
  Calendar,
  Clock,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PeriodType, GoalFrontmatter } from '@/types';

interface PeriodOption {
  type: PeriodType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  format: 'focus-areas' | 'simple-tasks' | 'yearly-theme';
}

const periodOptions: PeriodOption[] = [
  {
    type: 'vision',
    label: 'Vision',
    description: 'Long-term aspirations and guiding principles (2-5 years)',
    icon: Star,
    color: 'text-purple-500',
    format: 'focus-areas',
  },
  {
    type: 'yearly',
    label: 'Yearly Focus',
    description: 'Themes and focus areas for the year',
    icon: Target,
    color: 'text-blue-500',
    format: 'yearly-theme',
  },
  {
    type: 'quarterly',
    label: 'Quarterly Focus',
    description: 'Key objectives and priorities for the quarter',
    icon: Target,
    color: 'text-cyan-500',
    format: 'focus-areas',
  },
  {
    type: 'monthly',
    label: 'Monthly Goals',
    description: 'Specific, actionable tasks for the month',
    icon: Calendar,
    color: 'text-emerald-500',
    format: 'simple-tasks',
  },
  {
    type: 'weekly',
    label: 'Weekly Goals',
    description: 'Tasks and objectives for the week',
    icon: Clock,
    color: 'text-amber-500',
    format: 'simple-tasks',
  },
];

interface Task {
  id: string;
  text: string;
  section?: string;
}

function NewGoalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial values from URL params
  const initialPeriod = searchParams.get('period') as PeriodType | null;
  const initialYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
  const initialMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : getMonth(new Date()) + 1;
  const initialQuarter = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : getQuarter(new Date());
  const initialWeek = searchParams.get('week') ? parseInt(searchParams.get('week')!) : getWeek(new Date(), { weekStartsOn: 1 });

  const [step, setStep] = useState<'select' | 'create'>(initialPeriod ? 'create' : 'select');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType | null>(initialPeriod);
  const [isSaving, setIsSaving] = useState(false);

  // Yearly-theme format state
  const [emoji, setEmoji] = useState('');
  const [theme, setTheme] = useState('');

  // Focus-areas format state (for vision/quarterly)
  const [sections, setSections] = useState<string[]>(['Focus Area 1']);
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: '', section: 'Focus Area 1' },
  ]);

  // Simple-tasks format state (for monthly/weekly)
  const [simpleTasks, setSimpleTasks] = useState<Task[]>([
    { id: '1', text: '' },
  ]);

  // Period-specific state
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [quarter, setQuarter] = useState(initialQuarter);
  const [week, setWeek] = useState(initialWeek);

  const selectedOption = periodOptions.find(p => p.type === selectedPeriod);

  const handleSelectPeriod = (type: PeriodType) => {
    setSelectedPeriod(type);
    setStep('create');

    // Reset form state based on format
    const option = periodOptions.find(p => p.type === type);
    if (option?.format === 'yearly-theme') {
      setEmoji('');
      setTheme('');
    } else if (option?.format === 'simple-tasks') {
      setSimpleTasks([{ id: '1', text: '' }]);
    } else {
      setSections(['Focus Area 1']);
      setTasks([{ id: '1', text: '', section: 'Focus Area 1' }]);
    }
  };

  // Focus-areas format helpers
  const addSection = () => {
    const newSection = `Focus Area ${sections.length + 1}`;
    setSections([...sections, newSection]);
    setTasks([...tasks, { id: Date.now().toString(), text: '', section: newSection }]);
  };

  const addTask = (section: string) => {
    setTasks([...tasks, { id: Date.now().toString(), text: '', section }]);
  };

  const updateTask = (id: string, text: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, text } : t));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateSectionName = (oldName: string, newName: string) => {
    setSections(sections.map(s => s === oldName ? newName : s));
    setTasks(tasks.map(t => t.section === oldName ? { ...t, section: newName } : t));
  };

  // Simple-tasks format helpers
  const addSimpleTask = () => {
    setSimpleTasks([...simpleTasks, { id: Date.now().toString(), text: '' }]);
  };

  const updateSimpleTask = (id: string, text: string) => {
    setSimpleTasks(simpleTasks.map(t => t.id === id ? { ...t, text } : t));
  };

  const removeSimpleTask = (id: string) => {
    setSimpleTasks(simpleTasks.filter(t => t.id !== id));
  };

  const getFilePath = (): string => {
    const monthName = format(new Date(year, month - 1), 'MMMM').toLowerCase();

    switch (selectedPeriod) {
      case 'vision':
        return `vision/${year + 2}.md`;
      case 'yearly':
        return `goals/${year}/yearly.md`;
      case 'quarterly':
        return `goals/${year}/q${quarter}/quarterly.md`;
      case 'monthly':
        return `goals/${year}/q${Math.ceil(month / 3)}/${monthName}/monthly.md`;
      case 'weekly':
        return `goals/${year}/q${Math.ceil(month / 3)}/${monthName}/week-${String(week).padStart(2, '0')}.md`;
      default:
        return '';
    }
  };

  const getDateRange = () => {
    const baseDate = new Date(year, month - 1, 1);

    switch (selectedPeriod) {
      case 'vision':
        return { start: startOfYear(new Date()), end: endOfYear(addYears(new Date(), 2)) };
      case 'yearly':
        return { start: startOfYear(baseDate), end: endOfYear(baseDate) };
      case 'quarterly':
        const quarterDate = new Date(year, (quarter - 1) * 3, 1);
        return { start: startOfQuarter(quarterDate), end: endOfQuarter(quarterDate) };
      case 'monthly':
        return { start: startOfMonth(baseDate), end: endOfMonth(baseDate) };
      case 'weekly':
        // Find the week's start date
        const weekStart = startOfWeek(new Date(year, month - 1, (week - 1) * 7 + 1), { weekStartsOn: 1 });
        return { start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) };
      default:
        return { start: new Date(), end: new Date() };
    }
  };

  // Validate form based on format
  const isValid = () => {
    if (!selectedPeriod) return false;

    if (selectedOption?.format === 'yearly-theme') {
      return theme.trim().length > 0;
    } else if (selectedOption?.format === 'simple-tasks') {
      return simpleTasks.some(t => t.text.trim().length > 0);
    } else {
      return tasks.some(t => t.text.trim().length > 0);
    }
  };

  const handleSave = async () => {
    if (!selectedPeriod || !isValid()) return;

    setIsSaving(true);

    try {
      const dateRange = getDateRange();

      const frontmatter: GoalFrontmatter = {
        type: 'goal',
        period: selectedPeriod,
        year: selectedPeriod === 'vision' ? year + 2 : year,
        quarter: ['quarterly', 'monthly', 'weekly'].includes(selectedPeriod) ? (selectedPeriod === 'quarterly' ? quarter : Math.ceil(month / 3)) : undefined,
        month: ['monthly', 'weekly'].includes(selectedPeriod) ? month : undefined,
        week: selectedPeriod === 'weekly' ? week : undefined,
        start: format(dateRange.start, 'yyyy-MM-dd'),
        end: format(dateRange.end, 'yyyy-MM-dd'),
        status: 'not-started',
        created: new Date().toISOString(),
        // Add emoji and theme for yearly goals
        ...(selectedPeriod === 'yearly' && emoji && { emoji }),
        ...(selectedPeriod === 'yearly' && theme && { theme }),
        // Vision year range
        ...(selectedPeriod === 'vision' && { startYear: year, endYear: year + 5 }),
      };

      // Build content based on format
      let content = '';

      if (selectedOption?.format === 'yearly-theme') {
        // Yearly format: has expectations and focus areas
        // Use ## headers and direct bullets (matching historic format)
        content = `## ${year} Største forventninger

- Add your main expectations here

## 🏆 Personlig udvikling / mindset

- Add focus points here

## 💻 Arbejde / Indkomst

- Add focus points here

## 💙 Relationer

- Add focus points here

## 🧠 Læring

- Add focus points here

## 💪🏼 Fitness og sundhed

- Add focus points here
`;
      } else if (selectedOption?.format === 'simple-tasks') {
        // Monthly/Weekly: simple task list with header
        const monthNames = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
                            'juli', 'august', 'september', 'oktober', 'november', 'december'];

        if (selectedPeriod === 'monthly') {
          const monthName = monthNames[month - 1] || '';
          const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          content = `## ${capitalizedMonth} mål\n\n`;
        } else if (selectedPeriod === 'weekly') {
          content = `## Ugens mål\n\n`;
        }

        const validTasks = simpleTasks.filter(t => t.text.trim());
        for (const task of validTasks) {
          content += `- [ ] ${task.text}\n`;
        }
      } else {
        // Vision/Quarterly: focus areas format with ## headers
        if (selectedPeriod === 'quarterly') {
          // Add expectations header for quarterly
          content = `## Q${quarter} Største forventninger

- Add your main expectations here

`;
        }

        for (const section of sections) {
          content += `## ${section}\n\n`;

          if (selectedPeriod === 'vision') {
            content += `**Mål:** Define your goal here\n`;
            content += `*Årsag:* Why this matters\n\n`;
          }

          const sectionTasks = tasks.filter(t => t.section === section && t.text.trim());
          for (const task of sectionTasks) {
            content += `- ${task.text}\n`;
          }
          content += '\n';
        }
      }

      const path = getFilePath();

      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, frontmatter, content }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/goals/${path}`);
      }
    } catch (error) {
      console.error('Failed to save goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="New Goal"
        subtitle={
          step === 'select'
            ? 'Choose a goal type to get started'
            : `Creating ${selectedOption?.label || ''}`
        }
        actions={
          step === 'create' && (
            <Button size="sm" variant="outline" onClick={() => setStep('select')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )
        }
      />

      <div className="p-6">
        {step === 'select' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto"
          >
            <div className="grid gap-4">
              {periodOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <motion.button
                    key={option.type}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSelectPeriod(option.type)}
                    className="text-left"
                  >
                    <Card className="transition-all hover:shadow-md hover:border-primary/20">
                      <CardContent className="flex items-center gap-4 p-6">
                        <div className={cn('p-3 rounded-lg bg-muted', option.color)}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{option.label}</h3>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {option.format === 'simple-tasks' && 'Checkable tasks'}
                            {option.format === 'yearly-theme' && 'Emoji + theme'}
                            {option.format === 'focus-areas' && 'Focus areas'}
                          </Badge>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            {/* Period Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Period Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {selectedPeriod !== 'vision' && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Year</label>
                      <Input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        min={2020}
                        max={2030}
                      />
                    </div>
                  )}

                  {selectedPeriod === 'quarterly' && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Quarter</label>
                      <select
                        value={quarter}
                        onChange={(e) => setQuarter(parseInt(e.target.value))}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value={1}>Q1</option>
                        <option value={2}>Q2</option>
                        <option value={3}>Q3</option>
                        <option value={4}>Q4</option>
                      </select>
                    </div>
                  )}

                  {(selectedPeriod === 'monthly' || selectedPeriod === 'weekly') && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Month</label>
                      <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {format(new Date(year, i), 'MMMM')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedPeriod === 'weekly' && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Week</label>
                      <Input
                        type="number"
                        value={week}
                        onChange={(e) => setWeek(parseInt(e.target.value))}
                        min={1}
                        max={53}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Yearly Theme Format */}
            {selectedOption?.format === 'yearly-theme' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Year Theme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Emoji</label>
                      <Input
                        value={emoji}
                        onChange={(e) => setEmoji(e.target.value)}
                        placeholder="🔱"
                        className="text-2xl text-center"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Theme</label>
                      <Input
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        placeholder="Agency & ownership"
                        className="text-lg"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The theme will be displayed as: {emoji || '🎯'} {year}: {theme || 'Your theme'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Simple Tasks Format (Monthly/Weekly) */}
            {selectedOption?.format === 'simple-tasks' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {simpleTasks.map((task, index) => (
                    <div key={task.id} className="flex items-center gap-2">
                      <span className="text-muted-foreground">☐</span>
                      <Input
                        value={task.text}
                        onChange={(e) => updateSimpleTask(task.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const newId = Date.now().toString();
                            const updated = [...simpleTasks];
                            updated.splice(index + 1, 0, { id: newId, text: '' });
                            setSimpleTasks(updated);
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('[data-new-task-input]');
                              const nextInput = inputs[index + 1] as HTMLInputElement;
                              nextInput?.focus();
                            }, 0);
                          }
                        }}
                        data-new-task-input
                        placeholder="What do you want to accomplish?"
                        className="flex-1"
                      />
                      {simpleTasks.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSimpleTask(task.id)}
                          className="text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={addSimpleTask}
                    className="text-muted-foreground"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add task
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Focus Areas Format (Vision/Quarterly) */}
            {selectedOption?.format === 'focus-areas' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Focus Areas</CardTitle>
                  <Button size="sm" variant="outline" onClick={addSection}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Section
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {sections.map((section) => (
                    <div key={section} className="space-y-3">
                      <Input
                        value={section}
                        onChange={(e) => updateSectionName(section, e.target.value)}
                        className="font-medium"
                        placeholder="Section name (e.g., 🏆 Personal Development)"
                      />
                      <div className="space-y-2 pl-4">
                        <p className="text-xs text-muted-foreground">Focus points:</p>
                        {tasks
                          .filter(t => t.section === section)
                          .map((task, taskIndex) => (
                            <div key={task.id} className="flex items-center gap-2">
                              <span className="text-muted-foreground">•</span>
                              <Input
                                value={task.text}
                                onChange={(e) => updateTask(task.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const newId = Date.now().toString();
                                    const sectionTasks = tasks.filter(t => t.section === section);
                                    const taskIdx = tasks.findIndex(t => t.id === task.id);
                                    const updated = [...tasks];
                                    updated.splice(taskIdx + 1, 0, { id: newId, text: '', section });
                                    setTasks(updated);
                                    setTimeout(() => {
                                      const inputs = document.querySelectorAll(`[data-new-focus-input="${section}"]`);
                                      const nextInput = inputs[taskIndex + 1] as HTMLInputElement;
                                      nextInput?.focus();
                                    }, 0);
                                  }
                                }}
                                data-new-focus-input={section}
                                placeholder="Focus point..."
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeTask(task.id)}
                                className="text-destructive h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => addTask(section)}
                          className="text-muted-foreground"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add point
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !isValid()}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Create Goal'}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function NewGoalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <NewGoalPageContent />
    </Suspense>
  );
}
