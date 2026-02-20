import { z } from 'zod/v4';
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { getCurrentGoals, buildGoalTree, writeGoal, readGoal } from './goals';
import { getRecentReflections, getReflectionsForYear, writeReflection, getReflectionPath } from './reflections';
import { periodToPath, getCurrentPeriod } from './periods';
import type { GoalFrontmatter, ReflectionFrontmatter, PeriodType } from '@/types';

const periodTypes = ['vision', 'yearly', 'quarterly', 'monthly', 'weekly'] as const;

const getCurrentGoalsTool = tool(
  'getCurrentGoals',
  'Returns all current goals (weekly, monthly, quarterly, yearly, vision) with their tasks and completion status. Use this to understand where the user currently is.',
  {},
  async () => {
    const goals = await getCurrentGoals();
    const result: Record<string, unknown> = {};

    for (const [key, goal] of Object.entries(goals)) {
      if (goal) {
        const completed = goal.tasks.filter(t => t.completed).length;
        result[key] = {
          path: goal.path,
          title: goal.title,
          content: goal.content,
          tasksCompleted: completed,
          tasksTotal: goal.tasks.length,
          progress: goal.tasks.length > 0 ? Math.round((completed / goal.tasks.length) * 100) : 0,
          status: goal.frontmatter.status,
          period: goal.frontmatter.period,
          year: goal.frontmatter.year,
          quarter: goal.frontmatter.quarter,
          month: goal.frontmatter.month,
          week: goal.frontmatter.week,
        };
      } else {
        result[key] = null;
      }
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
  { annotations: { readOnly: true } }
);

const getReflectionsTool = tool(
  'getReflections',
  'Returns reflections for context. Can filter by year and limit results. Use this to understand the user\'s progress and mindset.',
  {
    year: z.number().optional().describe('Filter reflections by year'),
    limit: z.number().optional().describe('Maximum number of reflections to return (default: 5)'),
    periodType: z.enum(periodTypes).optional().describe('Filter by period type'),
  },
  async (args) => {
    let reflections;

    if (args.year) {
      reflections = await getReflectionsForYear(args.year);
    } else {
      reflections = await getRecentReflections(args.limit || 5);
    }

    if (args.periodType) {
      reflections = reflections.filter(r => r.frontmatter.period === args.periodType);
    }

    if (args.limit) {
      reflections = reflections.slice(0, args.limit);
    }

    const result = reflections.map(r => ({
      path: r.path,
      title: r.title,
      period: r.frontmatter.period,
      year: r.frontmatter.year,
      quarter: r.frontmatter.quarter,
      month: r.frontmatter.month,
      week: r.frontmatter.week,
      date: r.frontmatter.date,
      goalsCompleted: r.frontmatter.goalsCompleted,
      goalsTotal: r.frontmatter.goalsTotal,
      content: r.content,
    }));

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
  { annotations: { readOnly: true } }
);

const getGoalHierarchyTool = tool(
  'getGoalHierarchy',
  'Returns the full goal tree for a given year, showing the hierarchy from vision down to weekly goals with progress at each level.',
  {
    year: z.number().describe('The year to build the goal tree for'),
  },
  async (args) => {
    const tree = await buildGoalTree(args.year);
    return { content: [{ type: 'text' as const, text: JSON.stringify(tree, null, 2) }] };
  },
  { annotations: { readOnly: true } }
);

const writeGoalTool = tool(
  'writeGoal',
  'Writes a goal file with correct frontmatter and path structure. Only use after the user has approved the suggested goals.',
  {
    periodType: z.enum(periodTypes).describe('The period type for this goal'),
    year: z.number().describe('The year'),
    quarter: z.number().optional().describe('Quarter number (1-4)'),
    month: z.number().optional().describe('Month number (1-12)'),
    week: z.number().optional().describe('ISO week number'),
    content: z.string().describe('The full markdown content of the goal (including headings and task lists)'),
  },
  async (args) => {
    const period = getCurrentPeriod(args.periodType as PeriodType, new Date(args.year, (args.month || 1) - 1, 1));

    // Override with specific values if provided
    if (args.quarter) period.quarter = args.quarter;
    if (args.month) period.month = args.month;
    if (args.week) period.week = args.week;
    period.year = args.year;

    const filePath = periodToPath(period);

    const frontmatter: GoalFrontmatter = {
      type: 'goal',
      period: args.periodType as PeriodType,
      year: args.year,
      quarter: args.quarter,
      month: args.month,
      week: args.week,
      start: period.start.toISOString().split('T')[0],
      end: period.end.toISOString().split('T')[0],
      status: 'not-started',
      created: new Date().toISOString(),
    };

    const success = await writeGoal(filePath, frontmatter, args.content);

    if (success) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, path: filePath, message: `Goal written to ${filePath}` }),
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: false, error: 'Failed to write goal file' }),
      }],
      isError: true,
    };
  },
  { annotations: { destructive: true } }
);

const writeReflectionTool = tool(
  'writeReflection',
  'Writes a reflection file with correct frontmatter and path structure.',
  {
    periodType: z.enum(periodTypes).describe('The period type for this reflection'),
    year: z.number().describe('The year'),
    quarter: z.number().optional().describe('Quarter number (1-4)'),
    month: z.number().optional().describe('Month number (1-12)'),
    week: z.number().optional().describe('ISO week number'),
    content: z.string().describe('The full markdown content of the reflection'),
  },
  async (args) => {
    const period = getCurrentPeriod(args.periodType as PeriodType, new Date(args.year, (args.month || 1) - 1, 1));

    if (args.quarter) period.quarter = args.quarter;
    if (args.month) period.month = args.month;
    if (args.week) period.week = args.week;
    period.year = args.year;

    const filePath = getReflectionPath(period);

    const frontmatter: ReflectionFrontmatter = {
      type: 'reflection',
      period: args.periodType as PeriodType,
      year: args.year,
      quarter: args.quarter,
      month: args.month,
      week: args.week,
      date: new Date().toISOString().split('T')[0],
      created: new Date().toISOString(),
    };

    const success = await writeReflection(filePath, frontmatter, args.content);

    if (success) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ success: true, path: filePath, message: `Reflection written to ${filePath}` }),
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: false, error: 'Failed to write reflection file' }),
      }],
      isError: true,
    };
  },
  { annotations: { destructive: true } }
);

const readGoalFileTool = tool(
  'readGoalFile',
  'Read a specific goal or vision file by its path.',
  {
    path: z.string().describe('The relative path to the goal file within the data directory'),
  },
  async (args) => {
    const goal = await readGoal(args.path);
    if (!goal) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: 'File not found', path: args.path }) }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          path: goal.path,
          title: goal.title,
          content: goal.content,
          frontmatter: goal.frontmatter,
          tasks: goal.tasks,
        }, null, 2),
      }],
    };
  },
  { annotations: { readOnly: true } }
);

export const northstarMcpServer = createSdkMcpServer({
  name: 'northstar',
  version: '1.0.0',
  tools: [
    getCurrentGoalsTool,
    getReflectionsTool,
    getGoalHierarchyTool,
    writeGoalTool,
    writeReflectionTool,
    readGoalFileTool,
  ],
});
