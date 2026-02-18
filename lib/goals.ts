import { readMarkdownFile, writeMarkdownFile, listMarkdownFiles, fileExists } from './files';
import { periodToPath, getCurrentPeriod } from './periods';
import type { Goal, GoalFrontmatter, Task, GoalTreeNode, PeriodType, PeriodInfo } from '@/types';

// Parse tasks from markdown content
export function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');
  let currentSection = '';
  let taskId = 0;

  for (const line of lines) {
    // Track section headers
    if (line.startsWith('### ')) {
      currentSection = line.replace('### ', '').trim();
      continue;
    }

    // Parse checkbox tasks
    const taskMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/);
    if (taskMatch) {
      tasks.push({
        id: `task-${taskId++}`,
        text: taskMatch[2].trim(),
        completed: taskMatch[1].toLowerCase() === 'x',
        section: currentSection || undefined,
      });
    }
  }

  return tasks;
}

// Extract title from markdown content
export function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : 'Untitled';
}

// Calculate progress from tasks
export function calculateProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

// Read a single goal
export async function readGoal(filePath: string): Promise<Goal | null> {
  const file = await readMarkdownFile<GoalFrontmatter>(filePath);
  if (!file) return null;

  const tasks = parseTasks(file.content);
  const title = extractTitle(file.content);

  return {
    id: filePath.replace(/[/.]/g, '-'),
    path: filePath,
    frontmatter: file.frontmatter,
    content: file.content,
    title,
    tasks,
  };
}

// Write a goal
export async function writeGoal(
  filePath: string,
  frontmatter: GoalFrontmatter,
  content: string
): Promise<boolean> {
  const updatedFrontmatter = {
    ...frontmatter,
    updated: new Date().toISOString(),
  };
  return writeMarkdownFile(filePath, updatedFrontmatter, content);
}

// Get goal for a specific period
export async function getGoalForPeriod(period: PeriodInfo): Promise<Goal | null> {
  const filePath = periodToPath(period);
  return readGoal(filePath);
}

// Get current period goals (weekly, monthly, quarterly, yearly)
export async function getCurrentGoals(): Promise<{
  weekly: Goal | null;
  monthly: Goal | null;
  quarterly: Goal | null;
  yearly: Goal | null;
  vision: Goal | null;
}> {
  const now = new Date();

  const [weekly, monthly, quarterly, yearly, vision] = await Promise.all([
    getGoalForPeriod(getCurrentPeriod('weekly', now)),
    getGoalForPeriod(getCurrentPeriod('monthly', now)),
    getGoalForPeriod(getCurrentPeriod('quarterly', now)),
    getGoalForPeriod(getCurrentPeriod('yearly', now)),
    getGoalForPeriod(getCurrentPeriod('vision', now)),
  ]);

  return { weekly, monthly, quarterly, yearly, vision };
}

// Get all goals for a year
export async function getGoalsForYear(year: number): Promise<Goal[]> {
  const files = await listMarkdownFiles(`goals/${year}`);
  const goals = await Promise.all(files.map((f) => readGoal(f)));
  return goals.filter((g): g is Goal => g !== null);
}

// Get vision that applies to a specific year
export async function getVisionForYear(year: number): Promise<Goal | null> {
  // Look for any vision files
  const visionFiles = await listMarkdownFiles('vision');

  for (const file of visionFiles) {
    const vision = await readGoal(file);
    if (vision && vision.frontmatter.period === 'vision') {
      const startYear = vision.frontmatter.startYear;
      const endYear = vision.frontmatter.endYear;

      // Check if this year falls within the vision's range
      if (startYear && endYear && year >= startYear && year <= endYear) {
        return vision;
      }

      // Fallback: if no range, check if year matches
      if (!startYear && !endYear && vision.frontmatter.year === year) {
        return vision;
      }
    }
  }

  return null;
}

// Build goal tree for visualization
export async function buildGoalTree(year: number): Promise<GoalTreeNode | null> {
  // Get vision
  const visionPath = `vision/${year + 2}.md`;
  const visionExists = await fileExists(visionPath);
  let vision: Goal | null = null;
  if (visionExists) {
    vision = await readGoal(visionPath);
  }

  // Get yearly goal
  const yearlyGoal = await readGoal(`goals/${year}/yearly.md`);

  // Build tree structure
  const buildNode = (goal: Goal | null, period: PeriodType, label: string): GoalTreeNode | null => {
    if (!goal) return null;

    const tasks = goal.tasks;
    const completed = tasks.filter((t) => t.completed).length;

    return {
      id: goal.id,
      title: label,
      period,
      status: goal.frontmatter.status,
      progress: calculateProgress(tasks),
      path: goal.path,
      children: [],
      tasksCompleted: completed,
      tasksTotal: tasks.length,
    };
  };

  // Build hierarchy
  const root: GoalTreeNode = {
    id: 'root',
    title: `${year}`,
    period: 'yearly',
    status: yearlyGoal?.frontmatter.status || 'not-started',
    progress: 0,
    path: `goals/${year}/yearly.md`,
    children: [],
    tasksCompleted: 0,
    tasksTotal: 0,
  };

  if (yearlyGoal) {
    root.progress = calculateProgress(yearlyGoal.tasks);
    root.tasksCompleted = yearlyGoal.tasks.filter((t) => t.completed).length;
    root.tasksTotal = yearlyGoal.tasks.length;
  }

  // Add vision as parent if exists
  if (vision) {
    const visionNode = buildNode(vision, 'vision', `Vision ${year + 2}`);
    if (visionNode) {
      visionNode.children = [root];
      return visionNode;
    }
  }

  // Get all goals and organize into tree
  const allGoals = await getGoalsForYear(year);

  // Organize by quarter
  for (let q = 1; q <= 4; q++) {
    const quarterGoal = allGoals.find(
      (g) => g.frontmatter.period === 'quarterly' && g.frontmatter.quarter === q
    );

    const quarterNode: GoalTreeNode = {
      id: `q${q}-${year}`,
      title: `Q${q}`,
      period: 'quarterly',
      status: quarterGoal?.frontmatter.status || 'not-started',
      progress: quarterGoal ? calculateProgress(quarterGoal.tasks) : 0,
      path: `goals/${year}/q${q}/quarterly.md`,
      children: [],
      tasksCompleted: quarterGoal?.tasks.filter((t) => t.completed).length || 0,
      tasksTotal: quarterGoal?.tasks.length || 0,
    };

    // Add monthly goals
    const quarterMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
    for (const month of quarterMonths) {
      const monthGoal = allGoals.find(
        (g) => g.frontmatter.period === 'monthly' && g.frontmatter.month === month
      );

      if (monthGoal) {
        const monthNode: GoalTreeNode = {
          id: `m${month}-${year}`,
          title: monthGoal.title || `Month ${month}`,
          period: 'monthly',
          status: monthGoal.frontmatter.status,
          progress: calculateProgress(monthGoal.tasks),
          path: monthGoal.path,
          children: [],
          tasksCompleted: monthGoal.tasks.filter((t) => t.completed).length,
          tasksTotal: monthGoal.tasks.length,
        };

        // Add weekly goals
        const weeklyGoals = allGoals.filter(
          (g) => g.frontmatter.period === 'weekly' && g.frontmatter.month === month
        );

        for (const weekGoal of weeklyGoals) {
          const weekNode: GoalTreeNode = {
            id: weekGoal.id,
            title: `Week ${weekGoal.frontmatter.week}`,
            period: 'weekly',
            status: weekGoal.frontmatter.status,
            progress: calculateProgress(weekGoal.tasks),
            path: weekGoal.path,
            children: [],
            tasksCompleted: weekGoal.tasks.filter((t) => t.completed).length,
            tasksTotal: weekGoal.tasks.length,
          };
          monthNode.children.push(weekNode);
        }

        quarterNode.children.push(monthNode);
      }
    }

    if (quarterNode.children.length > 0 || quarterGoal) {
      root.children.push(quarterNode);
    }
  }

  return root;
}

// Update task completion in goal content
export function updateTaskInContent(content: string, taskId: string, completed: boolean): string {
  const lines = content.split('\n');
  let taskIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const taskMatch = lines[i].match(/^([-*]\s*\[)([ xX])(\]\s*.+)$/);
    if (taskMatch) {
      if (`task-${taskIndex}` === taskId) {
        lines[i] = `${taskMatch[1]}${completed ? 'x' : ' '}${taskMatch[3]}`;
        break;
      }
      taskIndex++;
    }
  }

  return lines.join('\n');
}

// Create default goal content
export function createDefaultGoalContent(period: PeriodInfo): { frontmatter: GoalFrontmatter; content: string } {
  const frontmatter: GoalFrontmatter = {
    type: 'goal',
    period: period.type,
    year: period.year,
    quarter: period.quarter,
    month: period.month,
    week: period.week,
    start: period.start.toISOString().split('T')[0],
    end: period.end.toISOString().split('T')[0],
    status: 'not-started',
    created: new Date().toISOString(),
  };

  const content = `# ${period.label} Goals

## Focus Areas

### 1. Area One
- [ ] First task
- [ ] Second task

### 2. Area Two
- [ ] Another task

## Notes

Add any additional context or thoughts here...
`;

  return { frontmatter, content };
}
