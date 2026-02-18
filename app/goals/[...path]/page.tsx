'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Edit2,
  Calendar,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Plus,
  Target,
  ChevronDown,
  ChevronRight,
  Save,
  Trash2,
  Compass,
  Mountain,
  Layers,
  CalendarDays,
  ListChecks,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Goal, Reflection, PeriodType } from '@/types';

// Period visual config
const periodConfig: Record<PeriodType, { icon: React.ElementType; label: string }> = {
  vision: { icon: Compass, label: 'Vision' },
  yearly: { icon: Mountain, label: 'Year' },
  quarterly: { icon: Layers, label: 'Quarter' },
  monthly: { icon: CalendarDays, label: 'Month' },
  weekly: { icon: ListChecks, label: 'Week' },
};

// Parse structured content from markdown for vision/yearly/quarterly
interface FocusAreaParsed {
  emoji: string;
  name: string;
  goal?: string;
  reason?: string;
  points: string[];
}

interface ParsedContent {
  expectations: string[];
  focusAreas: FocusAreaParsed[];
}

// More robust emoji extraction that handles skin tone modifiers
function extractEmoji(text: string): { emoji: string; rest: string } {
  // Match emoji with optional skin tone modifiers, ZWJ sequences, etc.
  const emojiRegex = /^(\p{Emoji}(?:\p{Emoji_Modifier}|\uFE0F|\u200D\p{Emoji})*)/u;
  const match = text.match(emojiRegex);
  if (match) {
    return { emoji: match[1], rest: text.slice(match[1].length).trim() };
  }
  return { emoji: '📌', rest: text.trim() };
}

function parseStructuredContent(content: string, isVision: boolean): ParsedContent {
  const lines = content.split('\n');
  const expectations: string[] = [];
  const focusAreas: FocusAreaParsed[] = [];

  let currentArea: FocusAreaParsed | null = null;
  let inExpectations = false;
  let inFocusPoints = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip separators
    if (trimmed.startsWith('---')) {
      continue;
    }

    // Check for section headers (## or ### with emoji or expectations keyword)
    // Handle both ## and ### formats for compatibility
    const headerMatch = trimmed.match(/^(#{2,3})\s+(.+)$/);
    if (headerMatch) {
      const headerContent = headerMatch[2].replace(/\*\*/g, '').trim();

      // Check if this is an expectations header
      if (headerContent.includes('Største målsætninger') || headerContent.includes('Største forventninger')) {
        // Save previous area if exists
        if (currentArea) {
          focusAreas.push(currentArea);
          currentArea = null;
        }
        inExpectations = true;
        inFocusPoints = false;
        continue;
      }

      // This is a focus area header
      // Save previous area
      if (currentArea) {
        focusAreas.push(currentArea);
      }

      inExpectations = false;
      // For historic format (## headers), bullets are directly under the header
      // For new format (### headers with Fokuspunkter), we wait for the Fokuspunkter marker
      inFocusPoints = true; // Default to true for direct bullet parsing

      // Parse the header - extract emoji and name
      const { emoji, rest: name } = extractEmoji(headerContent);

      currentArea = {
        emoji,
        name,
        points: [],
      };
      continue;
    }

    // Check for Mål (goal) in vision
    if (isVision && currentArea && (trimmed.startsWith('**Mål:') || trimmed.startsWith('**Mål') || trimmed.includes('Mål:'))) {
      currentArea.goal = trimmed
        .replace(/^\*\*Mål:\s*/, '')
        .replace(/^\*\*Mål\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/Mål:\s*/, '')
        .trim();
      continue;
    }

    // Check for Årsag (reason) in vision
    if (isVision && currentArea && (trimmed.startsWith('*Årsag:') || trimmed.includes('Årsag:'))) {
      currentArea.reason = trimmed
        .replace(/^\*Årsag:\s*/, '')
        .replace(/\*/g, '')
        .replace(/Årsag:\s*/, '')
        .trim();
      continue;
    }

    // Check for Fokuspunkter marker (in newer format)
    if (trimmed === '- Fokuspunkter' || trimmed === 'Fokuspunkter') {
      inFocusPoints = true;
      continue;
    }

    // Calculate indentation level (number of leading spaces)
    const leadingSpaces = line.length - line.trimStart().length;

    // Parse bullet points
    if (trimmed.startsWith('- ')) {
      const bulletText = trimmed.substring(2).trim();

      // Skip "Fokuspunkter" label
      if (bulletText === 'Fokuspunkter') {
        inFocusPoints = true;
        continue;
      }

      // Skip empty bullets
      if (!bulletText) continue;

      if (inExpectations) {
        expectations.push(bulletText);
      } else if (currentArea && inFocusPoints) {
        // Determine if this is a sub-point based on indentation
        if (leadingSpaces >= 4) {
          currentArea.points.push('  ' + bulletText);
        } else {
          currentArea.points.push(bulletText);
        }
      }
    }
  }

  // Save last area
  if (currentArea) {
    focusAreas.push(currentArea);
  }

  return { expectations, focusAreas };
}

// Editing state interfaces
interface EditableTask {
  id: string;
  text: string;
  completed: boolean;
}

interface EditableFocusArea {
  emoji: string;
  name: string;
  goal?: string;
  reason?: string;
  points: string[];
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [linkedReflection, setLinkedReflection] = useState<Reflection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});

  // Yearly theme editing state
  const [editEmoji, setEditEmoji] = useState('');
  const [editTheme, setEditTheme] = useState('');

  // Focus area editing state (for vision/yearly/quarterly)
  const [editExpectations, setEditExpectations] = useState<string[]>([]);
  const [editFocusAreas, setEditFocusAreas] = useState<EditableFocusArea[]>([]);

  // Task editing state (for monthly/weekly)
  const [editTasks, setEditTasks] = useState<EditableTask[]>([]);

  // Reconstruct the file path from URL params
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');

  // Initialize editing state from current goal
  const initializeEditingState = useCallback((goalData: Goal) => {
    const period = goalData.frontmatter.period;

    if (period === 'yearly') {
      setEditEmoji(goalData.frontmatter.emoji || '');
      setEditTheme(goalData.frontmatter.theme || '');
    }

    if (['vision', 'yearly', 'quarterly'].includes(period)) {
      const parsed = parseStructuredContent(goalData.content, period === 'vision');
      setEditExpectations([...parsed.expectations]);
      setEditFocusAreas(parsed.focusAreas.map(area => ({
        emoji: area.emoji,
        name: area.name,
        goal: area.goal,
        reason: area.reason,
        points: [...area.points],
      })));
    }

    if (['monthly', 'weekly'].includes(period)) {
      setEditTasks(goalData.tasks.map(t => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
      })));
    }
  }, []);

  // Convert editing state back to markdown content
  const buildMarkdownContent = useCallback((): string => {
    if (!goal) return '';
    const period = goal.frontmatter.period;
    const { frontmatter } = goal;

    if (['monthly', 'weekly'].includes(period)) {
      // Simple task list with header
      const monthNames = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
                          'juli', 'august', 'september', 'oktober', 'november', 'december'];

      let header = '';
      if (period === 'monthly' && frontmatter.month) {
        const monthName = monthNames[(frontmatter.month - 1)] || '';
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        header = `## ${capitalizedMonth} mål\n\n`;
      } else if (period === 'weekly') {
        header = `## Ugens mål\n\n`;
      }

      return header + editTasks.map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n');
    }

    // Build structured content for vision/yearly/quarterly
    let content = '';

    // Add expectations section - format depends on period type
    if (editExpectations.length > 0) {
      let label = '';
      if (period === 'vision') {
        label = 'Største målsætninger';
      } else if (period === 'yearly') {
        label = `${frontmatter.year} Største forventninger`;
      } else if (period === 'quarterly') {
        label = `Q${frontmatter.quarter} Største forventninger`;
      }
      content += `## ${label}\n\n`;
      editExpectations.forEach(exp => {
        content += `- ${exp}\n`;
      });
      content += '\n';
    }

    // Add focus areas - use ## headers with bullets directly underneath
    editFocusAreas.forEach(area => {
      content += `## ${area.emoji} ${area.name}\n\n`;

      if (period === 'vision' && (area.goal || area.reason)) {
        if (area.goal) content += `**Mål:** ${area.goal}\n`;
        if (area.reason) content += `*Årsag: ${area.reason}*\n\n`;
      }

      // Bullets directly under the header (no Fokuspunkter sub-header)
      area.points.forEach(point => {
        const isSubPoint = point.startsWith('  ');
        const text = isSubPoint ? point.trim() : point;
        content += isSubPoint ? `    - ${text}\n` : `- ${text}\n`;
      });
      content += '\n';
    });

    return content.trim();
  }, [goal, editTasks, editExpectations, editFocusAreas]);

  // Start editing
  const handleStartEditing = () => {
    if (goal) {
      initializeEditingState(goal);
      setIsEditing(true);
    }
  };

  // Cancel editing
  const handleCancelEditing = () => {
    setIsEditing(false);
  };

  const fetchGoal = useCallback(async () => {
    if (!path) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/goals?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.success) {
        setGoal(data.data);

        // Initialize all areas as expanded
        const areas: Record<string, boolean> = {};
        const goalData = data.data as Goal;
        const parsed = parseStructuredContent(goalData.content, goalData.frontmatter.period === 'vision');
        parsed.focusAreas.forEach((_, i) => {
          areas[`area-${i}`] = true;
        });
        setExpandedAreas(areas);

        // Skip reflection lookup for vision
        if (goalData.frontmatter.period === 'vision') {
          setIsLoading(false);
          return;
        }

        // Try to find linked reflection
        const { frontmatter } = goalData;

        // Fetch reflections for the year to find matching one
        const reflectionsRes = await fetch(`/api/reflections?year=${frontmatter.year}`);
        const reflectionsData = await reflectionsRes.json();

        if (reflectionsData.success) {
          const reflections = reflectionsData.data as Reflection[];
          const matchingReflection = reflections.find(r => {
            if (r.frontmatter.linkedGoalPath === goalData.path) {
              return true;
            }
            if (r.frontmatter.period !== frontmatter.period) return false;
            if (frontmatter.period === 'weekly') {
              return r.frontmatter.week === frontmatter.week && r.frontmatter.month === frontmatter.month;
            }
            if (frontmatter.period === 'monthly') {
              return r.frontmatter.month === frontmatter.month;
            }
            if (frontmatter.period === 'quarterly') {
              return r.frontmatter.quarter === frontmatter.quarter;
            }
            if (frontmatter.period === 'yearly') {
              return r.frontmatter.year === frontmatter.year;
            }
            return false;
          });

          if (matchingReflection) {
            setLinkedReflection(matchingReflection);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch goal:', error);
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!goal) return;

    try {
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: goal.path, taskId, completed }),
      });

      const data = await res.json();
      if (data.success) {
        setGoal(data.data);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleSave = async () => {
    if (!goal) return;

    setIsSaving(true);
    try {
      const content = buildMarkdownContent();
      const updatedFrontmatter = { ...goal.frontmatter };

      // Update yearly-specific frontmatter
      if (goal.frontmatter.period === 'yearly') {
        updatedFrontmatter.emoji = editEmoji || undefined;
        updatedFrontmatter.theme = editTheme || undefined;
      }

      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: goal.path,
          frontmatter: updatedFrontmatter,
          content,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGoal(data.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => ({
      ...prev,
      [areaId]: !prev[areaId],
    }));
  };

  // Build breadcrumb items with proper navigation links
  const getBreadcrumbItems = (): { label: string; href?: string }[] => {
    if (!goal) return [];

    const items: { label: string; href?: string }[] = [{ label: 'Goals', href: '/goals' }];

    const { frontmatter } = goal;
    const year = frontmatter.year || 2025;
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];

    // Add vision link if not on vision page but descending from a vision
    if (frontmatter.period !== 'vision' && year) {
      items.push({ label: String(year), href: `/goals/goals/${year}/yearly.md` });
    }

    // Add quarter link - navigates to quarterly goal
    if (frontmatter.quarter) {
      const quarterPath = `goals/${year}/q${frontmatter.quarter}/quarterly.md`;
      const isCurrentPage = frontmatter.period === 'quarterly';
      items.push({
        label: `Q${frontmatter.quarter}`,
        href: isCurrentPage ? undefined : `/goals/${quarterPath}`,
      });
    }

    // Add month link - navigates to monthly goal
    if (frontmatter.month) {
      const monthName = format(new Date(year, (frontmatter.month || 1) - 1), 'MMMM');
      const monthKey = monthNames[(frontmatter.month || 1) - 1];
      const quarterNum = Math.ceil((frontmatter.month || 1) / 3);
      const monthPath = `goals/${year}/q${quarterNum}/${monthKey}/monthly.md`;
      const isCurrentPage = frontmatter.period === 'monthly';
      items.push({
        label: monthName,
        href: isCurrentPage ? undefined : `/goals/${monthPath}`,
      });
    }

    // Add week (no link - it's the current page for weekly goals)
    if (frontmatter.week) {
      items.push({ label: `Week ${frontmatter.week}` });
    }

    return items;
  };

  // Get new reflection URL for this goal
  const getNewReflectionUrl = (): string => {
    if (!goal) return '/reflect/new';
    const { frontmatter } = goal;
    const params = new URLSearchParams();
    params.set('period', frontmatter.period);
    if (frontmatter.year) params.set('year', String(frontmatter.year));
    if (frontmatter.month) params.set('month', String(frontmatter.month));
    if (frontmatter.week) params.set('week', String(frontmatter.week));
    return `/reflect/new?${params.toString()}`;
  };

  // Get vision year label
  const getVisionYearLabel = () => {
    if (!goal) return '';
    const { startYear, endYear } = goal.frontmatter;
    if (startYear && endYear) {
      return `${startYear}-${endYear}`;
    }
    return String(goal.frontmatter.year || '');
  };

  // Get goal title display
  const getGoalTitle = () => {
    if (!goal) return '';
    const { frontmatter } = goal;

    if (frontmatter.period === 'vision') {
      return `Vision ${getVisionYearLabel()}`;
    }

    if (frontmatter.period === 'yearly') {
      if (frontmatter.emoji && frontmatter.theme) {
        return `${frontmatter.emoji} ${frontmatter.year}: ${frontmatter.theme}`;
      }
      return `${frontmatter.year}`;
    }

    if (frontmatter.period === 'quarterly') {
      return `Q${frontmatter.quarter} ${frontmatter.year}`;
    }

    if (frontmatter.period === 'monthly') {
      const monthName = format(new Date(frontmatter.year || 2025, (frontmatter.month || 1) - 1), 'MMMM');
      return `${monthName} ${frontmatter.year}`;
    }

    if (frontmatter.period === 'weekly') {
      return `Week ${frontmatter.week}`;
    }

    return goal.title;
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

  if (!goal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Compass className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-2xl font-medium mb-2">Goal not found</h2>
          <p className="text-muted-foreground mb-6">
            This goal may have been moved or doesn&apos;t exist yet.
          </p>
          <Button variant="outline" onClick={() => router.push('/goals')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Goals
          </Button>
        </motion.div>
      </div>
    );
  }

  // Check if this is a completeable period (monthly/weekly) - has checkboxes
  const isCompleteable = ['monthly', 'weekly'].includes(goal.frontmatter.period);

  // Check if this is a focus-area based goal (vision/yearly/quarterly)
  const isFocusAreaBased = ['vision', 'yearly', 'quarterly'].includes(goal.frontmatter.period);

  // Check if this goal should have reflections (not vision)
  const hasReflections = goal.frontmatter.period !== 'vision';

  const completedTasks = goal.tasks.filter((t) => t.completed).length;
  const totalTasks = goal.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Parse structured content for focus-area based goals
  const parsedContent = isFocusAreaBased
    ? parseStructuredContent(goal.content, goal.frontmatter.period === 'vision')
    : { expectations: [], focusAreas: [] };


  const PeriodIcon = periodConfig[goal.frontmatter.period].icon;

  return (
    <div className="min-h-screen">
      {/* Refined header area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b border-border/50 bg-card/30"
      >
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <Breadcrumb items={getBreadcrumbItems()} className="mb-4" />

          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Period icon */}
              <div className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
                'bg-primary/10 text-primary'
              )}>
                <PeriodIcon className="h-6 w-6" />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={cn(
                    'inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border',
                    `badge-${goal.frontmatter.period}`
                  )}>
                    {goal.frontmatter.period}
                  </span>
                  {goal.frontmatter.status && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {goal.frontmatter.status}
                    </span>
                  )}
                </div>
                <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight">
                  {getGoalTitle()}
                </h1>
                {goal.frontmatter.start && goal.frontmatter.end && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(goal.frontmatter.start), 'MMM d')} – {format(new Date(goal.frontmatter.end), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleCancelEditing} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-1.5" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleStartEditing}>
                  <Edit2 className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar for task-based goals */}
          {isCompleteable && totalTasks > 0 && (
            <div className="mt-5 pt-5 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {completedTasks} of {totalTasks} tasks completed
                </span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className={cn(
                    'h-full rounded-full',
                    progress === 100 ? 'bg-primary' : 'bg-primary/70'
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Yearly Theme Editor */}
            {goal.frontmatter.period === 'yearly' && (
              <section className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-medium mb-4">Year Theme</h3>
                <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Emoji</label>
                    <Input
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                      placeholder="🔱"
                      className="text-2xl text-center h-12"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Theme</label>
                    <Input
                      value={editTheme}
                      onChange={(e) => setEditTheme(e.target.value)}
                      placeholder="Agency & ownership"
                      className="text-lg h-12"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Tasks Editor (Monthly/Weekly) */}
            {['monthly', 'weekly'].includes(goal.frontmatter.period) && (
              <section className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-medium mb-4">Tasks</h3>
                <div className="space-y-2">
                  {editTasks.map((task, index) => (
                    <div key={task.id} className="flex items-center gap-3 group">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) => {
                          const updated = [...editTasks];
                          updated[index].completed = checked as boolean;
                          setEditTasks(updated);
                        }}
                        className="mt-0.5"
                      />
                      <Input
                        value={task.text}
                        onChange={(e) => {
                          const updated = [...editTasks];
                          updated[index].text = e.target.value;
                          setEditTasks(updated);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const newId = `task-${Date.now()}`;
                            const updated = [...editTasks];
                            updated.splice(index + 1, 0, { id: newId, text: '', completed: false });
                            setEditTasks(updated);
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('[data-task-input]');
                              const nextInput = inputs[index + 1] as HTMLInputElement;
                              nextInput?.focus();
                            }, 0);
                          }
                        }}
                        data-task-input
                        placeholder="What needs to be done?"
                        className={cn(
                          'flex-1 border-transparent bg-transparent px-0',
                          'focus:border-border focus:bg-background focus:px-3',
                          'transition-all duration-200',
                          task.completed && 'line-through text-muted-foreground'
                        )}
                      />
                      <button
                        onClick={() => setEditTasks(editTasks.filter((_, i) => i !== index))}
                        className={cn(
                          'p-1.5 rounded-lg text-muted-foreground',
                          'opacity-0 group-hover:opacity-100',
                          'hover:bg-destructive/10 hover:text-destructive',
                          'transition-all duration-200'
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditTasks([...editTasks, { id: `task-${Date.now()}`, text: '', completed: false }])}
                    className={cn(
                      'flex items-center gap-2 w-full py-2 text-sm',
                      'text-muted-foreground hover:text-foreground',
                      'transition-colors duration-200'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    Add task
                  </button>
                </div>
              </section>
            )}

            {/* Focus Areas Editor (Vision/Yearly/Quarterly) */}
            {['vision', 'yearly', 'quarterly'].includes(goal.frontmatter.period) && (
              <>
                {/* Expectations Editor */}
                <section className="rounded-2xl border border-border/50 bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h3 className="font-medium">
                      {goal.frontmatter.period === 'vision' ? 'Største målsætninger' : 'Største forventninger'}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {editExpectations.map((exp, index) => (
                      <div key={index} className="flex items-center gap-3 group">
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <Input
                          value={exp}
                          onChange={(e) => {
                            const updated = [...editExpectations];
                            updated[index] = e.target.value;
                            setEditExpectations(updated);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const updated = [...editExpectations];
                              updated.splice(index + 1, 0, '');
                              setEditExpectations(updated);
                              setTimeout(() => {
                                const inputs = document.querySelectorAll('[data-expectation-input]');
                                const nextInput = inputs[index + 1] as HTMLInputElement;
                                nextInput?.focus();
                              }, 0);
                            }
                          }}
                          data-expectation-input
                          placeholder="What do you expect to achieve?"
                          className="flex-1 border-transparent bg-transparent px-0 focus:border-border focus:bg-background focus:px-3 transition-all"
                        />
                        <button
                          onClick={() => setEditExpectations(editExpectations.filter((_, i) => i !== index))}
                          className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditExpectations([...editExpectations, ''])}
                      className="flex items-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add expectation
                    </button>
                  </div>
                </section>

                {/* Focus Areas */}
                {editFocusAreas.map((area, areaIndex) => (
                  <section key={areaIndex} className="rounded-2xl border border-border/50 bg-card p-6">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/50">
                      <Input
                        value={area.emoji}
                        onChange={(e) => {
                          const updated = [...editFocusAreas];
                          updated[areaIndex].emoji = e.target.value;
                          setEditFocusAreas(updated);
                        }}
                        className="w-14 h-14 text-2xl text-center rounded-xl"
                        maxLength={4}
                      />
                      <Input
                        value={area.name}
                        onChange={(e) => {
                          const updated = [...editFocusAreas];
                          updated[areaIndex].name = e.target.value;
                          setEditFocusAreas(updated);
                        }}
                        placeholder="Focus area name..."
                        className="flex-1 text-lg font-medium border-transparent bg-transparent px-0 focus:border-border focus:bg-background focus:px-3 transition-all"
                      />
                      {editFocusAreas.length > 1 && (
                        <button
                          onClick={() => setEditFocusAreas(editFocusAreas.filter((_, i) => i !== areaIndex))}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Mål and Årsag for Vision */}
                    {goal.frontmatter.period === 'vision' && (
                      <div className="space-y-4 mb-5 pb-5 border-b border-border/50">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1.5 block">Mål</label>
                          <Input
                            value={area.goal || ''}
                            onChange={(e) => {
                              const updated = [...editFocusAreas];
                              updated[areaIndex].goal = e.target.value;
                              setEditFocusAreas(updated);
                            }}
                            placeholder="What is the goal?"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1.5 block">Årsag</label>
                          <Input
                            value={area.reason || ''}
                            onChange={(e) => {
                              const updated = [...editFocusAreas];
                              updated[areaIndex].reason = e.target.value;
                              setEditFocusAreas(updated);
                            }}
                            placeholder="Why does this matter?"
                          />
                        </div>
                      </div>
                    )}

                    {/* Focus Points */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-3 block">Fokuspunkter</label>
                      <div className="space-y-2">
                        {area.points.map((point, pointIndex) => (
                          <div key={pointIndex} className="flex items-center gap-3 group">
                            <div className={cn(
                              'w-1.5 h-1.5 rounded-full flex-shrink-0',
                              point.startsWith('  ') ? 'bg-muted-foreground/50 ml-4' : 'bg-primary'
                            )} />
                            <Input
                              value={point.replace(/^\s+/, '')}
                              onChange={(e) => {
                                const updated = [...editFocusAreas];
                                const isSubPoint = point.startsWith('  ');
                                updated[areaIndex].points[pointIndex] = isSubPoint ? '  ' + e.target.value : e.target.value;
                                setEditFocusAreas(updated);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const updated = [...editFocusAreas];
                                  updated[areaIndex].points.splice(pointIndex + 1, 0, '');
                                  setEditFocusAreas(updated);
                                  setTimeout(() => {
                                    const inputs = document.querySelectorAll(`[data-focus-point-input="${areaIndex}"]`);
                                    const nextInput = inputs[pointIndex + 1] as HTMLInputElement;
                                    nextInput?.focus();
                                  }, 0);
                                }
                              }}
                              data-focus-point-input={areaIndex}
                              placeholder="Focus point..."
                              className="flex-1 border-transparent bg-transparent px-0 focus:border-border focus:bg-background focus:px-3 transition-all"
                            />
                            <button
                              onClick={() => {
                                const updated = [...editFocusAreas];
                                updated[areaIndex].points = area.points.filter((_, i) => i !== pointIndex);
                                setEditFocusAreas(updated);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const updated = [...editFocusAreas];
                            updated[areaIndex].points.push('');
                            setEditFocusAreas(updated);
                          }}
                          className="flex items-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add point
                        </button>
                      </div>
                    </div>
                  </section>
                ))}

                {/* Add new focus area */}
                <button
                  onClick={() => setEditFocusAreas([...editFocusAreas, { emoji: '📌', name: '', points: [''] }])}
                  className={cn(
                    'w-full py-4 rounded-2xl border-2 border-dashed border-border/50',
                    'text-muted-foreground hover:text-foreground hover:border-border',
                    'flex items-center justify-center gap-2 transition-colors'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Add Focus Area
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Linked Reflection - Only for non-vision goals */}
            {hasReflections && (
              <section>
                {linkedReflection ? (
                  <Link href={`/reflect/${linkedReflection.path}`} className="block group">
                    <div className={cn(
                      'flex items-center gap-4 p-4 rounded-xl',
                      'bg-primary/5 border border-primary/10',
                      'hover:bg-primary/10 transition-colors'
                    )}>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Reflection written</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(linkedReflection.frontmatter.date), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                ) : (
                  <Link href={getNewReflectionUrl()} className="block group">
                    <div className={cn(
                      'flex items-center gap-4 p-4 rounded-xl',
                      'border border-dashed border-border hover:border-primary/50',
                      'hover:bg-muted/30 transition-all'
                    )}>
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Add reflection</p>
                        <p className="text-xs text-muted-foreground">
                          Reflect on this {goal.frontmatter.period}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                )}
              </section>
            )}

            {/* Focus Area Based Goals (Vision/Yearly/Quarterly) */}
            {isFocusAreaBased && (
              <>
                {/* Expectations Section */}
                {parsedContent.expectations.length > 0 && (
                  <section className="rounded-2xl border border-border/50 bg-card/50 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <h2 className="font-medium">
                        {goal.frontmatter.period === 'vision' ? 'Største målsætninger' : 'Største forventninger'}
                      </h2>
                    </div>
                    <ul className="space-y-3">
                      {parsedContent.expectations.map((exp, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                          <span className="text-[15px] leading-relaxed">{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Focus Areas */}
                <div className="space-y-4">
                  {parsedContent.focusAreas.map((area, index) => {
                    const areaId = `area-${index}`;
                    const isExpanded = expandedAreas[areaId] ?? true;

                    return (
                      <motion.section
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-2xl border border-border/50 bg-card overflow-hidden"
                      >
                        <button
                          onClick={() => toggleArea(areaId)}
                          className={cn(
                            'w-full flex items-center gap-4 p-5',
                            'hover:bg-muted/30 transition-colors text-left'
                          )}
                        >
                          <span className="text-3xl">{area.emoji}</span>
                          <h3 className="flex-1 font-serif text-lg font-medium">{area.name}</h3>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 space-y-5">
                                {/* Goal and Reason (Vision only) */}
                                {goal.frontmatter.period === 'vision' && (area.goal || area.reason) && (
                                  <div className="pt-4 border-t border-border/50 space-y-3">
                                    {area.goal && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Mål</p>
                                        <p className="font-medium">{area.goal}</p>
                                      </div>
                                    )}
                                    {area.reason && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Årsag</p>
                                        <p className="text-muted-foreground italic">{area.reason}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Focus Points */}
                                {area.points.length > 0 && (
                                  <div className={goal.frontmatter.period === 'vision' ? '' : 'pt-4 border-t border-border/50'}>
                                    <p className="text-xs text-muted-foreground mb-3">Fokuspunkter</p>
                                    <ul className="space-y-2">
                                      {area.points.map((point, pi) => {
                                        const isSubPoint = point.startsWith('  ');
                                        const displayText = isSubPoint ? point.trim() : point;

                                        return (
                                          <li
                                            key={pi}
                                            className={cn(
                                              'flex items-start gap-3',
                                              isSubPoint && 'ml-5'
                                            )}
                                          >
                                            <div className={cn(
                                              'w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0',
                                              isSubPoint ? 'bg-muted-foreground/40' : 'bg-primary'
                                            )} />
                                            <span className={cn(
                                              'text-[15px] leading-relaxed',
                                              isSubPoint && 'text-muted-foreground'
                                            )}>
                                              {displayText}
                                            </span>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.section>
                    );
                  })}
                </div>
              </>
            )}

            {/* Task-based Goals (Monthly/Weekly) */}
            {isCompleteable && goal.tasks.length > 0 && (
              <section className="rounded-2xl border border-border/50 bg-card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-medium">Tasks</h2>
                </div>

                {/* Incomplete tasks */}
                {goal.tasks.filter(t => !t.completed).length > 0 && (
                  <div className="space-y-1 mb-4">
                    {goal.tasks.filter(t => !t.completed).map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        className={cn(
                          'flex items-start gap-3 p-3 -mx-2 rounded-xl',
                          'hover:bg-muted/50 transition-colors group'
                        )}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={(checked) =>
                            handleTaskToggle(task.id, checked as boolean)
                          }
                          className="mt-0.5"
                        />
                        <span className="flex-1 text-[15px] leading-relaxed">
                          {task.text}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Completed tasks */}
                {goal.tasks.filter(t => t.completed).length > 0 && (
                  <div className={cn(
                    goal.tasks.filter(t => !t.completed).length > 0 && 'pt-4 border-t border-border/50'
                  )}>
                    <p className="text-xs text-muted-foreground mb-2">Completed</p>
                    <div className="space-y-1">
                      {goal.tasks.filter(t => t.completed).map((task) => (
                        <motion.div
                          key={task.id}
                          layout
                          className={cn(
                            'flex items-start gap-3 p-3 -mx-2 rounded-xl',
                            'hover:bg-muted/50 transition-colors'
                          )}
                        >
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) =>
                              handleTaskToggle(task.id, checked as boolean)
                            }
                            className="mt-0.5"
                          />
                          <span className="flex-1 text-[15px] leading-relaxed line-through text-muted-foreground">
                            {task.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
