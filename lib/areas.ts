import { addDays } from 'date-fns';
import type { AreaKey, Task } from '@/types';

// ============================================================================
// LIFE AREAS — the six sub-categories that structure the whole goal system
// ============================================================================

export interface LifeArea {
  key: AreaKey;
  emoji: string;
  name: string;
  /** oklch color used for dots/accents in the program UI (works in light + dark) */
  color: string;
  /** lowercase tokens that resolve to this area when written as #tag */
  aliases: string[];
}

export const LIFE_AREAS: LifeArea[] = [
  {
    key: 'mindset',
    emoji: '🏆',
    name: 'Personlig udvikling',
    color: 'oklch(0.58 0.12 160)',
    aliases: ['mindset', 'personlig', 'udvikling', 'personligudvikling'],
  },
  {
    key: 'arbejde',
    emoji: '💻',
    name: 'Arbejde / Indkomst',
    color: 'oklch(0.55 0.11 250)',
    aliases: ['arbejde', 'indkomst', 'work', 'business', 'job'],
  },
  {
    key: 'relationer',
    emoji: '💙',
    name: 'Relationer',
    color: 'oklch(0.62 0.15 25)',
    aliases: ['relationer', 'relation', 'relations', 'familie', 'venner', 'family'],
  },
  {
    key: 'læring',
    emoji: '🧠',
    name: 'Læring',
    color: 'oklch(0.56 0.14 300)',
    aliases: ['læring', 'laering', 'learning', 'mentalt', 'læring/mentalt'],
  },
  {
    key: 'fitness',
    emoji: '💪',
    name: 'Fitness / Sundhed',
    color: 'oklch(0.64 0.13 145)',
    aliases: ['fitness', 'sundhed', 'motion', 'health', 'træning', 'traening', 'fysisk'],
  },
  {
    key: 'oplevelser',
    emoji: '🌍',
    name: 'Oplevelser / Eventyr',
    color: 'oklch(0.70 0.13 70)',
    aliases: ['oplevelser', 'oplevelse', 'eventyr', 'experiences', 'adventure', 'rejse', 'rejser'],
  },
];

const AREA_BY_KEY: Record<AreaKey, LifeArea> = LIFE_AREAS.reduce(
  (acc, a) => {
    acc[a.key] = a;
    return acc;
  },
  {} as Record<AreaKey, LifeArea>,
);

export function getArea(key?: AreaKey | null): LifeArea | undefined {
  return key ? AREA_BY_KEY[key] : undefined;
}

/** Resolve a free-form #tag token (e.g. "Fitness", "motion") to a known area. */
export function resolveArea(token: string): LifeArea | undefined {
  const normalized = token.toLowerCase().trim();
  return LIFE_AREAS.find((a) => a.key === normalized || a.aliases.includes(normalized));
}

// ============================================================================
// WEEKDAYS — Monday-first, Danish labels
// ============================================================================

export interface Weekday {
  index: number; // 0 = Monday … 6 = Sunday
  key: string;
  label: string;
  short: string;
}

export const WEEKDAYS: Weekday[] = [
  { index: 0, key: 'mandag', label: 'Mandag', short: 'Man' },
  { index: 1, key: 'tirsdag', label: 'Tirsdag', short: 'Tir' },
  { index: 2, key: 'onsdag', label: 'Onsdag', short: 'Ons' },
  { index: 3, key: 'torsdag', label: 'Torsdag', short: 'Tor' },
  { index: 4, key: 'fredag', label: 'Fredag', short: 'Fre' },
  { index: 5, key: 'lørdag', label: 'Lørdag', short: 'Lør' },
  { index: 6, key: 'søndag', label: 'Søndag', short: 'Søn' },
];

const ENGLISH_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** Map a section heading ("Mandag", "Man", "Monday") to a weekday index, or -1. */
export function dayIndexFromSection(section?: string): number {
  if (!section) return -1;
  const s = section.toLowerCase().trim();
  const da = WEEKDAYS.find((d) => d.key === s || d.short.toLowerCase() === s || s.startsWith(d.key));
  if (da) return da.index;
  const en = ENGLISH_DAYS.findIndex((d) => d === s || s.startsWith(d.slice(0, 3)));
  return en;
}

// ============================================================================
// TASK META PARSING — pull time + area + clean label out of raw task text
// ============================================================================

const TIME_RE = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/;
const TAG_RE = /#([\p{L}/]+)/u;

export interface TaskMeta {
  time?: string; // "07:00"
  areaKey?: AreaKey;
  label: string; // text with the time + area tag removed
}

/**
 * Parse a raw weekly/monthly task line.
 * Examples:
 *   "07:00 Gym #fitness"            → { time: "07:00", areaKey: "fitness", label: "Gym" }
 *   "Underskriv aftale #arbejde"    → { areaKey: "arbejde", label: "Underskriv aftale" }
 *   "Ring til mormor"               → { label: "Ring til mormor" }
 */
export function parseTaskMeta(raw: string): TaskMeta {
  let label = raw;
  let areaKey: AreaKey | undefined;
  let time: string | undefined;

  const tagMatch = label.match(TAG_RE);
  if (tagMatch) {
    const area = resolveArea(tagMatch[1]);
    if (area) {
      areaKey = area.key;
      label = label.replace(tagMatch[0], '');
    }
  }

  const timeMatch = label.match(TIME_RE);
  if (timeMatch) {
    time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    label = label.replace(timeMatch[0], '');
  }

  label = label
    .replace(/^\s*[—–-]\s*/, '')
    .replace(/\s*[—–-]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { time, areaKey, label: label || raw.trim() };
}

// ============================================================================
// PROGRAM GROUPING — turn a weekly goal's tasks into a Mon→Sun program
// ============================================================================

export interface ProgramDay extends Weekday {
  date?: Date;
  tasks: Task[];
  isToday: boolean;
}

export interface WeeklyProgram {
  days: ProgramDay[]; // always 7 (Mon→Sun)
  flexible: Task[]; // tasks with no recognised weekday
}

function sortByTime(a: Task, b: Task): number {
  if (a.time && b.time) return a.time.localeCompare(b.time);
  if (a.time) return -1;
  if (b.time) return 1;
  return 0;
}

/**
 * Group a weekly goal's tasks into a Monday→Sunday program.
 * `weekStart` (the Monday) lets us attach real dates and flag "today".
 */
export function buildWeeklyProgram(tasks: Task[], weekStart?: Date, today?: Date): WeeklyProgram {
  const now = today ?? new Date();
  const days: ProgramDay[] = WEEKDAYS.map((d) => {
    const date = weekStart ? addDays(weekStart, d.index) : undefined;
    const isToday = date
      ? date.toDateString() === now.toDateString()
      : false;
    return { ...d, date, tasks: [], isToday };
  });
  const flexible: Task[] = [];

  for (const task of tasks) {
    const idx = dayIndexFromSection(task.section);
    if (idx >= 0 && idx <= 6) {
      days[idx].tasks.push(task);
    } else {
      flexible.push(task);
    }
  }

  for (const d of days) d.tasks.sort(sortByTime);
  flexible.sort(sortByTime);

  return { days, flexible };
}

/** Group any tasks by life-area (used for the monthly 6-area view). */
export function groupTasksByArea(tasks: Task[]): { area: LifeArea; tasks: Task[] }[] {
  return LIFE_AREAS.map((area) => ({
    area,
    tasks: tasks.filter((t) => t.area === area.key),
  })).filter((g) => g.tasks.length > 0);
}

/** Clean display label for a task (falls back to raw text). */
export function taskLabel(task: Task): string {
  return task.label && task.label.length > 0 ? task.label : task.text;
}
