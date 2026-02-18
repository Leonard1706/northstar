// Period types for goal hierarchy
export type PeriodType = 'vision' | 'yearly' | 'quarterly' | 'monthly' | 'weekly';

// Status for goals
export type GoalStatus = 'not-started' | 'in-progress' | 'completed' | 'abandoned';

// Base frontmatter for all files
export interface BaseFrontmatter {
  type: 'goal' | 'reflection';
  created: string;
  updated?: string;
}

// Goal frontmatter
export interface GoalFrontmatter extends BaseFrontmatter {
  type: 'goal';
  period: PeriodType;
  // For vision: the year range it spans
  startYear?: number;
  endYear?: number;
  // For yearly goals: emoji and theme
  emoji?: string;
  theme?: string;
  // Standard period fields
  year?: number;
  quarter?: number;
  month?: number;
  week?: number;
  start?: string;
  end?: string;
  status: GoalStatus;
}

// Reflection frontmatter
export interface ReflectionFrontmatter extends BaseFrontmatter {
  type: 'reflection';
  period: PeriodType;
  year: number;
  quarter?: number;
  month?: number;
  week?: number;
  date: string;
  goalsCompleted?: number;
  goalsTotal?: number;
  completionRate?: number;
  linkedGoalPath?: string;
}

// Focus area for vision and yearly/quarterly goals
export interface FocusArea {
  id: string;
  emoji: string;
  name: string;
  // Only for vision
  goal?: string;
  reason?: string;
  // Focus points (can be nested)
  points: FocusPoint[];
}

// A focus point that can have nested sub-points
export interface FocusPoint {
  id: string;
  text: string;
  subPoints?: FocusPoint[];
}

// Parsed goal document
export interface Goal {
  id: string;
  path: string;
  frontmatter: GoalFrontmatter;
  content: string;
  title: string;
  // For vision/yearly/quarterly: focus areas with structured data
  focusAreas?: FocusArea[];
  // For vision/yearly: top-level expectations/goals
  expectations?: string[];
  // For monthly/weekly: simple checkable tasks
  tasks: Task[];
  children?: Goal[];
}

// Individual task within a goal (for monthly/weekly)
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  section?: string;
}

// Parsed reflection document
export interface Reflection {
  id: string;
  path: string;
  frontmatter: ReflectionFrontmatter;
  content: string;
  title: string;
  sections: ReflectionSection[];
}

// Reflection question/answer section
export interface ReflectionSection {
  question: string;
  answer: string;
}

// Goal tree node for hierarchy visualization
export interface GoalTreeNode {
  id: string;
  title: string;
  period: PeriodType;
  status: GoalStatus;
  progress: number; // 0-100
  path: string;
  children: GoalTreeNode[];
  tasksCompleted?: number;
  tasksTotal?: number;
}

// Period info for navigation
export interface PeriodInfo {
  type: PeriodType;
  year: number;
  quarter?: number;
  month?: number;
  week?: number;
  label: string;
  start: Date;
  end: Date;
  isCurrent: boolean;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// File write request
export interface WriteGoalRequest {
  path: string;
  frontmatter: GoalFrontmatter;
  content: string;
}

export interface WriteReflectionRequest {
  path: string;
  frontmatter: ReflectionFrontmatter;
  content: string;
}

// Dashboard data
export interface DashboardData {
  currentWeek: Goal | null;
  currentMonth: Goal | null;
  currentQuarter: Goal | null;
  currentYear: Goal | null;
  vision: Goal | null;
  recentReflections: Reflection[];
  overallProgress: number;
}
